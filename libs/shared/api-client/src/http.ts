// Minimal fetch-based HTTP client. No axios dependency -- relies on the native fetch available
// in modern browsers/Vite. Token storage is a simple localStorage-backed store; a real
// token-refresh-on-401 interceptor is reasonable to defer to M2 (see TODO below).

const ACCESS_TOKEN_KEY = 'gs_erp_access_token';
const REFRESH_TOKEN_KEY = 'gs_erp_refresh_token';

function getBaseUrl(): string {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return envBaseUrl || 'http://localhost:3000';
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface NestErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean; // whether to attach the Authorization header, defaults to true
}

/**
 * Small fetch wrapper: resolves the base URL, JSON-encodes the body, attaches the bearer token,
 * and throws a typed ApiError on non-2xx responses.
 *
 * TODO(M2): add a 401 interceptor that transparently calls POST /auth/refresh and retries once.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  };

  if (auth) {
    const accessToken = getAccessToken();
    if (accessToken) {
      finalHeaders['Authorization'] = `Bearer ${accessToken}`;
    }
  }

  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const rawText = await response.text();
  const data: unknown = rawText ? JSON.parse(rawText) : undefined;

  if (!response.ok) {
    const errorBody = data as NestErrorBody | undefined;
    const message = Array.isArray(errorBody?.message)
      ? errorBody?.message.join(', ')
      : errorBody?.message || response.statusText || 'Request failed';
    throw new ApiError(response.status, message);
  }

  return data as T;
}
