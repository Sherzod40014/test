import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../types';

/**
 * Must run after JwtAuthGuard (which populates req.user) -- apply as
 * @UseGuards(JwtAuthGuard, RolesGuard). @Roles() is opt-in: a handler/class with no roles
 * metadata at all is allowed through unconditionally by this guard.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const userRoles = request.user?.roles ?? [];
    const hasOverlap = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasOverlap) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
