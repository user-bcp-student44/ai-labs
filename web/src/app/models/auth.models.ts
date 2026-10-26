export interface LoginRequest {
  username: string;
  password: string;
  client: string;
}

export interface LoginResponse {
  token?: string;
  user?: AuthenticatedUser;
}

export interface AuthenticatedUser {
  username?: string;
  displayName?: string;
}

export interface UserSession {
  token: string;
  user: AuthenticatedUser;
}
