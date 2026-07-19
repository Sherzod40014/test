import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticatedUser } from '../types';

/**
 * Extracts the `req.user` object Passport attaches after JwtStrategy.validate() runs (see
 * ../jwt.strategy.ts). Only meaningful behind JwtAuthGuard -- on an unauthenticated request
 * req.user is undefined and this will return undefined too.
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
  return request.user;
});
