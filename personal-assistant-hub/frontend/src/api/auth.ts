import client from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
}

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<AuthResponse>('/auth/login', { email: data.email, password: data.password }),

  register: (data: RegisterRequest) =>
    client.post<AuthResponse>('/auth/register', {
      email: data.email,
      username: data.username,
      password: data.password,
    }),

  refresh: (refreshToken: string) =>
    client.post<{ access_token: string }>('/auth/refresh', { refresh_token: refreshToken }),

  logout: (token: string) =>
    client.post('/auth/logout', { token }),

  getMe: () =>
    client.get<User>('/auth/me'),
};
