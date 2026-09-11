import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Se llama con el token cuando el reto se supera, y con '' si caduca o falla. */
  onToken: (token: string) => void;
}

/** Handle mínimo de la API de Turnstile que usamos. */
interface ApiTurnstile {
  render: (
    elemento: HTMLElement,
    opciones: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: (codigo?: string) => void;
      theme?: 'light' | 'dark' | 'auto';
      language?: string;
    },
  ) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}

declare global {
  interface Window {
    turnstile?: ApiTurnstile;
  }
}

const URL_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const CLAVE_PUBLICA = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

/**
 * Si no hay clave pública configurada, la verificación queda desactivada y los
 * formularios NO deben exigir token: si no, sin claves nadie podría entrar.
 * El backend hace lo mismo — omite la comprobación en desarrollo cuando le
 * falta su secreto, y la exige siempre en producción.
 */
export const verificacionActiva = Boolean(CLAVE_PUBLICA);

/** Carga el script una sola vez, aunque haya varios formularios en la sesión. */
let promesaScript: Promise<void> | null = null;

function cargarScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (promesaScript) return promesaScript;

  promesaScript = new Promise<void>((resolver, rechazar) => {
    const script = document.createElement('script');
    script.src = URL_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolver();
    script.onerror = () => {
      // Si falla, se olvida la promesa para que un reintento pueda volver a
      // cargarlo (por ejemplo si el usuario recupera la conexión).
      promesaScript = null;
      rechazar(new Error('No se pudo cargar el script de Turnstile'));
    };
    document.head.appendChild(script);
  });

  return promesaScript;
}

/**
 * Widget "Verify you are human" de Cloudflare Turnstile.
 *
 * Es la tercera capa anti-bot, junto al campo señuelo y al límite de intentos
 * por IP. El token que produce es de un solo uso y lo valida el backend contra
 * Cloudflare: aquí no se decide nada, solo se obtiene.
 */
export function VerificacionHumano({ onToken }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const idWidget = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Sin clave no se dibuja nada: el aviso va a la consola, no a la pantalla
    // del usuario, que no puede hacer nada al respecto.
    if (!CLAVE_PUBLICA) {
      console.warn('VITE_TURNSTILE_SITE_KEY sin configurar: verificacion anti-bot desactivada.');
      return;
    }

    let montado = true;

    cargarScript()
      .then(() => {
        if (!montado || !contenedor.current || !window.turnstile) return;
        // Si el efecto se repite (StrictMode monta dos veces en desarrollo),
        // no se dibuja un segundo widget encima del primero.
        if (idWidget.current !== null) return;

        idWidget.current = window.turnstile.render(contenedor.current, {
          sitekey: CLAVE_PUBLICA,
          language: 'es',
          callback: (token) => onToken(token),
          // El token caduca a los pocos minutos: se avisa hacia arriba para que
          // el formulario no intente enviarse con uno ya inservible.
          'expired-callback': () => onToken(''),
          // Cloudflare pasa un codigo de error que dice la causa exacta. Sin el,
          // un fallo de configuracion (dominio no autorizado, sitekey mal) se ve
          // igual que un problema de red y no hay por donde empezar a mirar.
          //   110100 -> sitekey invalida
          //   110200 -> dominio no autorizado para este widget
          //   300xxx / 600xxx -> fallo interno o reto no superado
          'error-callback': (codigo?: string) => {
            onToken('');
            console.error('Turnstile fallo. Codigo:', codigo ?? '(sin codigo)');
            setError(`No se pudo completar la verificacion${codigo ? ` (codigo ${codigo})` : ''}.`);
          },
        });
      })
      .catch(() => {
        if (montado) setError('No se pudo cargar la verificacion. Revisa tu conexion.');
      });

    return () => {
      montado = false;
      if (idWidget.current !== null && window.turnstile) {
        window.turnstile.remove(idWidget.current);
        idWidget.current = null;
      }
    };
    // onToken se deja fuera a propósito: si el padre lo redefine en cada
    // render, incluirlo volvería a dibujar el widget sin parar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div ref={contenedor} className="flex justify-center" />
      {error && <p className="mt-2 text-center text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Reinicia el widget para pedir un token nuevo tras un envío fallido. */
export function reiniciarVerificacion(): void {
  window.turnstile?.reset();
}
