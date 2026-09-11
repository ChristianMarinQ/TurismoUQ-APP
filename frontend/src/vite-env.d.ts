/// <reference types="vite/client" />

/**
 * Variables de entorno del frontend. Solo las que empiezan por VITE_ llegan al
 * navegador; todo lo demas se queda en el servidor de Vite.
 *
 * Recuerda que estas variables se INCRUSTAN en el paquete compilado: cualquiera
 * puede leerlas desde el navegador. Aqui solo van valores publicos por diseno,
 * como la clave publica de Turnstile. Nunca un secreto.
 */
interface ImportMetaEnv {
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
