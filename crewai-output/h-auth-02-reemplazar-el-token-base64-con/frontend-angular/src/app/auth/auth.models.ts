// auth.models.ts

/**
 * El contrato recibido no describe los campos del body de login.
 * Se mantiene opaco para no inventar nombres ni tipos.
 */
export type LoginRequest = unknown;

/**
 * Solo se tipan los nombres garantizados por el contrato disponible.
 * Los tipos concretos de expiresIn y la estructura de user están pendientes.
 */
export interface LoginResponse {
  token: string;
  expiresIn: unknown;
  user: unknown;
}