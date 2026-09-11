import crypto from 'crypto';

/**
 * Integración con Wompi (sandbox) usando su "Web Checkout" (redirect).
 * Doc de referencia: https://docs.wompi.co/docs/colombia/widget-checkout-web/
 * Ajusta esta lógica si Wompi cambia el contrato de su API/checksum.
 */

interface DatosCheckout {
  idReserva: number;
  montoEnPesos: number;
  descripcion: string;
}

export function construirUrlCheckout({ idReserva, montoEnPesos }: DatosCheckout): string {
  const publicKey = process.env.WOMPI_PUBLIC_KEY!;
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET!;
  const currency = 'COP';
  const amountInCents = Math.round(montoEnPesos * 100);
  // La referencia debe ser única por intento de pago (no solo por reserva),
  // por si el cliente reintenta un pago fallido.
  const reference = `TURISMOUQ-RES-${idReserva}-${Date.now()}`;

  // El checkout de Wompi está detrás de AWS CloudFront, cuyo cortafuegos
  // RECHAZA CON 403 cualquier petición que lleve "localhost" en la URL (regla
  // genérica contra SSRF). Por eso no se le puede pasar directamente la
  // dirección del frontend de desarrollo.
  //
  // La vuelta: se le da una URL pública nuestra (el túnel), que apunta a un
  // endpoint del backend cuyo único trabajo es responder un 302 hacia el
  // frontend real. Wompi nunca ve "localhost"; el salto final lo da el
  // navegador del cliente, que sí puede resolverlo porque corre en su equipo.
  //
  // PUBLIC_URL es la base pública del BACKEND (la del túnel). Sin ella se cae
  // al comportamiento antiguo, que solo sirve cuando el frontend ya está
  // desplegado en un dominio público de verdad.
  const basePublica = process.env.PUBLIC_URL?.replace(/\/$/, '');
  const redirectUrl = basePublica
    ? `${basePublica}/api/pagos/retorno?reserva=${idReserva}`
    : `${process.env.FRONTEND_URL}/pago/resultado?reserva=${idReserva}`;

  // Firma de integridad: SHA256(referencia + monto_en_centavos + moneda + secreto)
  const cadena = `${reference}${amountInCents}${currency}${integritySecret}`;
  const signature = crypto.createHash('sha256').update(cadena).digest('hex');

  const params = new URLSearchParams({
    'public-key': publicKey,
    currency,
    'amount-in-cents': String(amountInCents),
    reference,
    'signature:integrity': signature,
    'redirect-url': redirectUrl,
  });

  return `https://checkout.wompi.co/p/?${params.toString()}`;
}

interface EventoWompi {
  event: string;
  data: {
    transaction: {
      id: string;
      status: 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'PENDING';
      amount_in_cents: number;
      reference: string;
      payment_method_type?: string;
    };
  };
  signature: {
    properties: string[];
    checksum: string;
  };
  timestamp: number;
}

/** Extrae un valor anidado de `obj` a partir de un path tipo "data.transaction.id". */
function valorPorPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

// Campos que Wompi realmente firma en un evento de transacción (según su
// documentación). Se usa esta lista FIJA en vez de `evento.signature.properties`
// (que viene del propio payload, no confiable) para que el checksum se
// calcule exactamente sobre los campos de los que este código depende
// (status, monto, referencia) — nunca sobre lo que el request declare.
const PROPIEDADES_FIRMADAS_ESPERADAS = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'];

/** Verifica la firma del evento de webhook de Wompi antes de confiar en él. */
export function verificarFirmaWebhook(evento: EventoWompi): boolean {
  if (!evento?.signature?.checksum || !Array.isArray(evento.signature.properties)) return false;

  // Si algún día Wompi cambia el orden/conjunto de campos firmados, esto
  // falla de forma segura (rechaza el evento) en vez de aceptar
  // silenciosamente una lista distinta a la esperada.
  const mismasPropiedades =
    evento.signature.properties.length === PROPIEDADES_FIRMADAS_ESPERADAS.length &&
    evento.signature.properties.every((p, i) => p === PROPIEDADES_FIRMADAS_ESPERADAS[i]);
  if (!mismasPropiedades) return false;

  const eventsSecret = process.env.WOMPI_EVENTS_SECRET!;

  // Las rutas de signature.properties ("transaction.id", "transaction.status")
  // son RELATIVAS A `data`, no a la raíz del evento. Resolverlas contra la raíz
  // devolvía undefined en las tres, la cadena firmada quedaba como
  // "" + "" + "" + timestamp + secreto, y el checksum no coincidía nunca: se
  // rechazaban TODOS los webhooks y las reservas se quedaban en PENDIENTE
  // aunque el pago estuviera aprobado.
  const valores = PROPIEDADES_FIRMADAS_ESPERADAS.map((prop) => valorPorPath(evento.data, prop));

  // Si alguna ruta no resuelve, se rechaza en vez de firmar sobre una cadena
  // vacía. Sin esto, un error de rutas como el anterior vuelve a fallar de
  // forma muda: todos los eventos rechazados y ninguna pista del motivo.
  if (valores.some((v) => v === undefined || v === null || v === '')) return false;

  const concatenado = valores.map(String).join('');
  const cadena = `${concatenado}${evento.timestamp}${eventsSecret}`;
  const checksumCalculado = crypto.createHash('sha256').update(cadena).digest('hex').toUpperCase();

  // Comparación en tiempo constante: evita filtrar por temporización
  // cuántos caracteres del checksum coinciden.
  const bufA = Buffer.from(checksumCalculado, 'utf8');
  const bufB = Buffer.from(evento.signature.checksum.toUpperCase(), 'utf8');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

export function extraerIdReservaDeReferencia(reference: string): number | null {
  const match = /^TURISMOUQ-RES-(\d+)-/.exec(reference);
  return match ? Number(match[1]) : null;
}

export type { EventoWompi };
