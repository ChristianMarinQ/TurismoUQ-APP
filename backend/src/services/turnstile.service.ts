/**
 * Verificación anti-bot con Cloudflare Turnstile.
 *
 * El navegador resuelve un reto y obtiene un token de un solo uso. Aquí ese
 * token se valida CONTRA CLOUDFLARE, servidor a servidor. Nunca se confía en
 * que el token "parezca" válido: un bot puede enviar cualquier cadena.
 *
 * Doc: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const URL_VERIFICACION = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Si la llamada a Cloudflare tarda más que esto, se da por fallida. */
const TIEMPO_LIMITE_MS = 5000;

interface RespuestaTurnstile {
  success: boolean;
  'error-codes'?: string[];
}

export function turnstileConfigurado(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Valida un token de Turnstile. Devuelve false ante cualquier duda: token
 * vacío, respuesta negativa, error de red o tiempo agotado.
 *
 * Falla CERRADO a propósito. Si Cloudflare no responde, se rechaza el intento
 * en vez de dejarlo pasar: preferimos que un humano reintente a abrirle la
 * puerta a un bot justo cuando la defensa está caída, que es cuando más se
 * aprovecharía.
 */
export async function verificarTurnstile(token: unknown, ip?: string): Promise<boolean> {
  const secreto = process.env.TURNSTILE_SECRET_KEY;
  if (!secreto) return false;
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) return false;

  const cuerpo = new URLSearchParams({ secret: secreto, response: token });
  // remoteip es opcional pero ayuda a Cloudflare a puntuar mejor el intento.
  if (ip) cuerpo.set('remoteip', ip);

  const abortar = new AbortController();
  const temporizador = setTimeout(() => abortar.abort(), TIEMPO_LIMITE_MS);

  try {
    const respuesta = await fetch(URL_VERIFICACION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: cuerpo,
      signal: abortar.signal,
    });

    if (!respuesta.ok) return false;

    const datos = (await respuesta.json()) as RespuestaTurnstile;

    if (!datos.success) {
      // Se registra el motivo en el servidor, nunca se le devuelve al cliente:
      // saber si el token estaba caducado, ya usado o mal formado le sirve a
      // quien esté probando cómo saltarse la verificación.
      console.warn('Turnstile rechazo un token:', datos['error-codes']?.join(', ') ?? 'sin detalle');
    }

    return datos.success === true;
  } catch (err) {
    console.error('Turnstile: fallo al verificar el token', err);
    return false;
  } finally {
    clearTimeout(temporizador);
  }
}
