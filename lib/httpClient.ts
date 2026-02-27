/**
 * httpClient — typed fetch wrapper for the FlashRide Node API.
 *
 * Automatically:
 *  - Attaches the current Supabase session JWT as Bearer token
 *  - Sets Content-Type: application/json
 *  - Throws a typed ApiError on non-2xx responses
 *  - Reads EXPO_PUBLIC_API_URL from environment
 */

import { supabase } from './supabase';

// Injected by Expo — set in .env as EXPO_PUBLIC_API_URL
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError(401, 'NO_SESSION', 'No active session. Please log in.');
  return token;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: { auth?: boolean } = { auth: true }
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.auth !== false) {
    const token = await getToken();
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  // Parse body regardless of status — error bodies have useful info
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json.error ?? json.code ?? 'UNKNOWN_ERROR',
      json.message ?? `Request failed with status ${res.status}`,
      json.details
    );
  }

  return json as T;
}

export const http = {
  get:    <T>(path: string)                    => request<T>('GET',    path),
  post:   <T>(path: string, body?: unknown)    => request<T>('POST',   path, body),
  patch:  <T>(path: string, body?: unknown)    => request<T>('PATCH',  path, body),
  delete: <T>(path: string)                    => request<T>('DELETE', path),
};
