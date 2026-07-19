import * as bcrypt from 'bcryptjs';

/**
 * Password hashing helpers shared by AuthService (login verification) and the database package's
 * seed script (hashing seeded users' passwords). Kept in this standalone module, with no NestJS
 * dependencies, so it can be imported from either place.
 */
const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
