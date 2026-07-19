import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@erp/backend-database';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { verifyPassword } from './password.util';
import { JwtPayload, LoginResult, RefreshResult } from './types';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
const INVALID_REFRESH_TOKEN_MESSAGE = 'Invalid or expired refresh token';
const REFRESH_TOKEN_SALT_ROUNDS = 10;

/** Roles that bypass per-warehouse checks entirely -- see RequestContext.hasAllWarehouseAccess. */
const ALL_WAREHOUSE_ACCESS_ROLES = new Set(['SUPER_ADMIN', 'COMPANY_ADMIN', 'LOGISTICS_MANAGER']);

const DURATION_UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/**
 * Hand-rolled parser for the small subset of duration strings env.schema.ts actually allows for
 * JWT_ACCESS_TTL / JWT_REFRESH_TTL (e.g. "15m", "1h", "30d"). Intentionally not a general-purpose
 * duration library -- if a future config value needs a format outside s/m/h/d, extend this.
 */
function parseDurationMs(duration: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(duration.trim());
  if (!match) {
    throw new Error(
      `Unsupported duration format: "${duration}". Expected a number followed by s/m/h/d, e.g. "30d".`,
    );
  }
  const [, amount, unit] = match;
  return Number(amount) * DURATION_UNIT_MS[unit.toLowerCase()];
}

function generateRefreshTokenPlaintext(): string {
  return randomBytes(40).toString('hex');
}

/**
 * Minimal structural shape AuthService needs out of a User row, regardless of exactly which
 * Prisma query produced it (login's by-email lookup vs. refresh's by-id lookup). Declared locally,
 * rather than importing the generated Prisma Client's model types, so this module has no
 * compile-time dependency on the generated client's output path -- the real query results
 * (which have additional fields) satisfy this structurally.
 */
interface UserForToken {
  id: string;
  companyId: string;
  email: string;
  fullName: string;
  isActive: boolean;
  passwordHash: string;
  roles: Array<{ role: { name: string } }>;
  warehouseAccess: Array<{ warehouseId: string }>;
}

interface RefreshTokenCandidate {
  id: string;
  userId: string;
}

/**
 * Login/refresh/logout business logic. Deliberately uses the RAW PrismaService (not
 * EXTENDED_PRISMA_CLIENT) for every query in this service: the by-email lookup in login() runs
 * before we know the caller's companyId (CLS isn't populated yet -- that only happens inside
 * JwtStrategy.validate(), which requires a valid access token this flow is trying to issue in the
 * first place), and RefreshToken has no companyId column at all. Using the raw client
 * consistently throughout this one service is simpler than mixing raw/extended clients depending
 * on which method is being called.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.fetchUserByEmail(email);

    // Same generic message for "no such user", "wrong password", and "deactivated user" -- never
    // reveal which one it was.
    if (!user || !user.isActive) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const { accessToken, refreshToken, roles } = await this.issueTokenPair(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles,
      },
    };
  }

  async refresh(refreshToken: string): Promise<RefreshResult> {
    const matched = await this.findRefreshTokenByPlaintext(refreshToken, { requireUnexpired: true });
    if (!matched) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }

    // Revoke immediately on match (rotation) -- even if something below fails, this token is dead.
    await this.prisma.refreshToken.update({
      where: { id: matched.id },
      data: { revokedAt: new Date() },
    });

    // Re-fetch fresh rather than trusting anything cached: roles/warehouse access/active status
    // may have changed since this refresh token was issued.
    const user = await this.fetchUserById(matched.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }

    const { accessToken, refreshToken: newRefreshToken } = await this.issueTokenPair(user);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string): Promise<void> {
    // Idempotent by design: whether or not a match is found, this always resolves the same way
    // (204, no body) so a caller can never learn whether a given token existed.
    const matched = await this.findRefreshTokenByPlaintext(refreshToken, { requireUnexpired: false });
    if (!matched) {
      return;
    }

    await this.prisma.refreshToken.update({
      where: { id: matched.id },
      data: { revokedAt: new Date() },
    });
  }

  private async fetchUserByEmail(email: string): Promise<UserForToken | null> {
    // Deliberately NOT scoped by companyId -- we don't have one yet. User.email is only unique
    // per-company (@@unique([companyId, email])), not globally, so in the rare case the same
    // email exists in two different companies this returns whichever row Postgres/Prisma happens
    // to return first. Acceptable for M1 per the milestone spec; flagged here for visibility.
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: {
        roles: { include: { role: true } },
        warehouseAccess: true,
      },
    });
  }

  private async fetchUserById(id: string): Promise<UserForToken | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        roles: { include: { role: true } },
        warehouseAccess: true,
      },
    });
  }

  /**
   * RefreshToken rows are only ever looked up by their bcrypt hash, never a direct equality match
   * on plaintext -- so a match requires scanning candidate rows and running bcrypt.compare against
   * each one. Fine at M1 scale (a handful of live sessions per company); if this ever becomes a
   * bottleneck, a future migration could add a fast, non-secret lookup key (e.g. a random public
   * token id prefix) stored alongside the secret hash instead of hashing the whole token.
   */
  private async findRefreshTokenByPlaintext(
    plaintext: string,
    options: { requireUnexpired: boolean },
  ): Promise<RefreshTokenCandidate | null> {
    const candidates = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
        ...(options.requireUnexpired ? { expiresAt: { gt: new Date() } } : {}),
      },
      select: { id: true, userId: true, tokenHash: true },
    });

    for (const candidate of candidates) {
      // Sequential on purpose: short-circuits on the first match instead of comparing against
      // every candidate every time.
      // eslint-disable-next-line no-await-in-loop
      if (await bcrypt.compare(plaintext, candidate.tokenHash)) {
        return { id: candidate.id, userId: candidate.userId };
      }
    }

    return null;
  }

  private buildAccessClaims(user: UserForToken): {
    roles: string[];
    hasAllWarehouseAccess: boolean;
    warehouseIds: string[];
  } {
    const roles = user.roles.map((userRole) => userRole.role.name);
    const hasAllWarehouseAccess = roles.some((role) => ALL_WAREHOUSE_ACCESS_ROLES.has(role));
    const warehouseIds = hasAllWarehouseAccess ? [] : user.warehouseAccess.map((access) => access.warehouseId);

    return { roles, hasAllWarehouseAccess, warehouseIds };
  }

  private async issueTokenPair(
    user: UserForToken,
  ): Promise<{ accessToken: string; refreshToken: string; roles: string[] }> {
    const { roles, hasAllWarehouseAccess, warehouseIds } = this.buildAccessClaims(user);

    const payload: JwtPayload = {
      sub: user.id,
      companyId: user.companyId,
      email: user.email,
      roles,
      hasAllWarehouseAccess,
      warehouseIds,
    };

    // JWT_ACCESS_TTL is baked into signOptions.expiresIn by IamModule's JwtModule.registerAsync,
    // so no expiresIn override is needed here.
    const accessToken = await this.jwtService.signAsync(payload);

    const refreshTokenPlaintext = generateRefreshTokenPlaintext();
    const tokenHash = await bcrypt.hash(refreshTokenPlaintext, REFRESH_TOKEN_SALT_ROUNDS);
    const refreshTtl = this.configService.get<string>('JWT_REFRESH_TTL', '30d');
    const expiresAt = new Date(Date.now() + parseDurationMs(refreshTtl));

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: refreshTokenPlaintext, roles };
  }
}
