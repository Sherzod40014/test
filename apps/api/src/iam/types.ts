/**
 * Shared type definitions for the IAM module: the JWT access-token payload contract, the shape
 * Passport attaches to `req.user` after JwtStrategy.validate() runs, and the response shapes
 * AuthService returns (which AuthController returns verbatim as JSON). See the milestone's
 * "AUTH / API CONTRACT" spec for the authoritative definition of these shapes -- other modules
 * (e.g. master-data) declare their own local copy of AuthenticatedUser's fields rather than
 * importing this file, so keep any change here in sync with that contract.
 */

/** Exactly what AuthService signs into the access token, and what JwtStrategy.validate() receives. */
export interface JwtPayload {
  sub: string;
  companyId: string;
  email: string;
  roles: string[];
  hasAllWarehouseAccess: boolean;
  warehouseIds: string[];
}

/** Attached to `req.user` by JwtStrategy.validate(); extracted by the @CurrentUser() decorator. */
export interface AuthenticatedUser {
  userId: string;
  companyId: string;
  email: string;
  roles: string[];
  hasAllWarehouseAccess: boolean;
  warehouseIds: string[];
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    roles: string[];
  };
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}
