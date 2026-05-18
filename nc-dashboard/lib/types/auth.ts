/* ------------------------------------------------------------------ */
/*  Auth types — 1:1 con TokenResponse y UserResponse del backend      */
/* ------------------------------------------------------------------ */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  name: string;
}
