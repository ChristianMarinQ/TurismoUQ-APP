import { Request, Response, NextFunction } from 'express';
import { verificarTurnstile, turnstileConfigurado } from '../services/turnstile.service';

/**
 * Exige un token de Cloudflare Turnstile válido antes de dejar pasar la
 * petición. Va en las rutas de autenticación, que son las que un bot ataca
 * para crear cuentas en masa o probar contraseñas.
 *
 * Es la tercera capa, no la única: ya están el campo señuelo (`sitio`) y el
 * límite de intentos por IP. Cada una frena un tipo distinto de abuso, y esta
 * es la que para al bot que sabe rellenar formularios bien.
 *
 * Sobre la configuración: si TURNSTILE_SECRET_KEY no está definida, en
 * desarrollo se deja pasar (con un aviso), para no bloquear a quien clone el
 * repositorio y todavía no tenga claves. En producción NO: sin clave se
 * rechaza todo, porque un despliegue mal configurado no puede quedarse en
 * silencio sin su defensa principal.
 */
export async function verificarAntiBot(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!turnstileConfigurado()) {
    if (process.env.NODE_ENV === 'production') {
      console.error('TURNSTILE_SECRET_KEY no esta configurada: se rechaza la peticion.');
      res.status(503).json({ error: 'La verificacion anti-bot no esta disponible.' });
      return;
    }
    console.warn('TURNSTILE_SECRET_KEY sin configurar: verificacion anti-bot OMITIDA (solo desarrollo).');
    next();
    return;
  }

  const { turnstileToken } = req.body as { turnstileToken?: unknown };
  const valido = await verificarTurnstile(turnstileToken, req.ip);

  if (!valido) {
    res.status(403).json({ error: 'No pudimos verificar que eres una persona. Intenta de nuevo.' });
    return;
  }

  // El token ya cumplió su función y no debe llegar a los esquemas de
  // validación ni a los controladores.
  delete (req.body as Record<string, unknown>).turnstileToken;
  next();
}
