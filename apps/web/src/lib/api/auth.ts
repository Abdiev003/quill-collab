import type {
  AuthResponse,
  LoginRequest,
  PublicUser,
  RegisterRequest,
} from '@quill-collab/shared';
import { api, setAccessToken } from './client';

export async function login(input: LoginRequest): Promise<AuthResponse> {
  const data = await api<AuthResponse>('/auth/login', {
    method: 'POST',
    json: input,
    anonymous: true,
  });
  setAccessToken(data.accessToken);
  return data;
}

export async function register(input: RegisterRequest): Promise<AuthResponse> {
  const data = await api<AuthResponse>('/auth/register', {
    method: 'POST',
    json: input,
    anonymous: true,
  });
  setAccessToken(data.accessToken);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await api<void>('/auth/logout', { method: 'POST', skipAuthRefresh: true });
  } finally {
    setAccessToken(null);
  }
}

export function fetchMe(): Promise<PublicUser> {
  return api<PublicUser>('/users/me');
}
