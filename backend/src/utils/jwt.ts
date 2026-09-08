import jwt from 'jsonwebtoken';

export interface PayloadSesion {
  id: number;
  tipo: 'cliente' | 'admin';
  nombre: string;
}

function secreto(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('Falta JWT_SECRET en las variables de entorno.');
  return s;
}

export function firmarToken(payload: PayloadSesion): string {
  return jwt.sign(payload, secreto(), { expiresIn: (process.env.JWT_EXPIRES_IN as any) ?? '7d' });
}

export function verificarToken(token: string): PayloadSesion {
  return jwt.verify(token, secreto()) as PayloadSesion;
}

export const NOMBRE_COOKIE = 'turismouq_token';

export const OPCIONES_COOKIE = {
  httpOnly: true, // JavaScript del navegador no puede leerla -> mitiga robo de token por XSS
  secure: process.env.NODE_ENV === 'production', // solo por HTTPS en producción; en dev local (http) se desactiva
  sameSite: 'lax' as const, // el navegador no la envía en peticiones cross-site -> mitiga CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días, debe coincidir con JWT_EXPIRES_IN
  path: '/',
};
