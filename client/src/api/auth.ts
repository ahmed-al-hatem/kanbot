import type { AuthResponse, LoginRequest, MeResponse, RegisterRequest, User } from '@/types/api';
import { request } from './client';

export function register(body: RegisterRequest): Promise<AuthResponse> {
  return request<AuthResponse>('POST', '/auth/register', { body });
}

export function login(body: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>('POST', '/auth/login', { body });
}

export async function fetchMe(signal?: AbortSignal): Promise<User> {
  const { user } = await request<MeResponse>('GET', '/auth/me', { signal });
  return user;
}
