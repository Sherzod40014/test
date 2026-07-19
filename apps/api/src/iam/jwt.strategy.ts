import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ClsService } from 'nestjs-cls';
import {
  CLS_KEY_COMPANY_ID,
  CLS_KEY_HAS_ALL_WAREHOUSE_ACCESS,
  CLS_KEY_USER_ID,
  CLS_KEY_WAREHOUSE_IDS,
} from '@erp/backend-database';
import { AuthenticatedUser, JwtPayload } from './types';

/**
 * Verifies the access token's signature/expiry (handled by passport-jwt before validate() is
 * ever called), then populates the request-scoped CLS context that EXTENDED_PRISMA_CLIENT's
 * tenant-scope/soft-delete extensions read for the rest of this request's lifetime. Every
 * downstream query against a tenant-scoped model depends on this having run first, which is why
 * this must happen inside validate() and not deferred to a later interceptor.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly cls: ClsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    this.cls.set(CLS_KEY_COMPANY_ID, payload.companyId);
    this.cls.set(CLS_KEY_USER_ID, payload.sub);
    this.cls.set(CLS_KEY_HAS_ALL_WAREHOUSE_ACCESS, payload.hasAllWarehouseAccess);
    this.cls.set(CLS_KEY_WAREHOUSE_IDS, payload.warehouseIds);

    return {
      userId: payload.sub,
      companyId: payload.companyId,
      email: payload.email,
      roles: payload.roles,
      hasAllWarehouseAccess: payload.hasAllWarehouseAccess,
      warehouseIds: payload.warehouseIds,
    };
  }
}
