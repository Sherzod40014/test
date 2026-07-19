import { apiFetch, clearTokens, getAccessToken, getRefreshToken, setTokens } from './http';

const USER_STORAGE_KEY = 'gs_erp_user';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/**
 * POSTs /auth/login, stores the returned access/refresh tokens (and a copy of the user object,
 * used by getCurrentUser()), and returns the authenticated user.
 */
export async function login(email: string, password: string): Promise<{ user: AuthUser }> {
  const response = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });

  setTokens(response.accessToken, response.refreshToken);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));

  return { user: response.user };
}

/**
 * POSTs /auth/logout with the stored refresh token, then clears local session state regardless
 * of whether the request succeeded (logout must always leave the client logged-out locally).
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await apiFetch<void>('/auth/logout', {
        method: 'POST',
        body: { refreshToken },
        auth: false,
      });
    }
  } catch {
    // Intentionally ignored -- logout must succeed locally even if the network call fails.
  } finally {
    clearTokens();
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

/**
 * Returns the user cached from the last successful login, or null if unavailable.
 *
 * TODO(M2): replace with a real "who am I" endpoint call once the token is close to expiry, and
 * add transparent token refresh instead of relying purely on cached state.
 */
export function getCurrentUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
