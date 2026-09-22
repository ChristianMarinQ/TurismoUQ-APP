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

const ALGORITMO = 'HS256' as const;

/**
 * La sesión de administrador dura mucho menos que la de un cliente. El token
 * es autocontenido: no hay forma de revocarlo antes de que venza, así que un
 * admin desactivado (o un portátil olvidado) conservaría el panel entero
 * durante los 7 días de una sesión normal. Ocho horas cubren una jornada.
 */
const VIGENCIA_ADMIN = '8h';

export function firmarToken(payload: PayloadSesion): string {
  const vigencia = payload.tipo === 'admin' ? VIGENCIA_ADMIN : (process.env.JWT_EXPIRES_IN ?? '7d');
  return jwt.sign(payload, secreto(), {
    expiresIn: vigencia as any,
    algorithm: ALGORITMO,
  });
}

export function verificarToken(token: string): PayloadSesion {
  // Se fija explícitamente el algoritmo esperado (en vez de confiar en el
  // que declare el propio token) para no dejar espacio a ataques de
  // confusión de algoritmo si en el futuro se introduce alguna clave
  // asimétrica en otra parte del proyecto.
  return jwt.verify(token, secreto(), { algorithms: [ALGORITMO] }) as PayloadSesion;
}

const ES_PRODUCCION = process.env.NODE_ENV === 'production';

// El prefijo "__Host-" es una protección extra de los navegadores: solo
// aceptan la cookie si va con Secure, Path=/ y sin atributo Domain, lo
// que impide que un subdominio o una respuesta HTTP (no HTTPS) intente
// suplantarla. Solo se puede usar cuando `secure` va en true (HTTPS),
// así que en desarrollo local (http) se usa el nombre normal.
export const NOMBRE_COOKIE = ES_PRODUCCION ? '__Host-turismouq_token' : 'turismouq_token';

export const OPCIONES_COOKIE = {
  httpOnly: true, // JavaScript del navegador no puede leerla -> mitiga robo de token por XSS
  secure: ES_PRODUCCION, // solo por HTTPS en producción; en dev local (http) se desactiva
  sameSite: 'lax' as const, // el navegador no la envía en peticiones cross-site -> mitiga CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días, debe coincidir con JWT_EXPIRES_IN
  path: '/',
};
