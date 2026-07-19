import { SetMetadata } from '@nestjs/common';

/** Metadata key RolesGuard reads to discover which roles a handler/class requires. */
export const ROLES_KEY = 'roles';

/**
 * Opt-in role restriction. A route/controller with no @Roles() at all is left alone by
 * RolesGuard (allowed through for any authenticated caller); only routes that declare @Roles(...)
 * are actually checked against the caller's roles.
 */
export const Roles = (...roles: string[]): MethodDecorator & ClassDecorator => SetMetadata(ROLES_KEY, roles);
