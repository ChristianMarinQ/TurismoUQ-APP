import { NextFunction, Request, Response } from 'express';

/** Traduce los ORA-2000x de negocio (ver pkg_reservas) a mensajes legibles. */
const MENSAJES_ORA: Record<number, string> = {
  20001: 'La fecha de salida debe ser posterior a la de llegada.',
  20002: 'Esa habitación ya no está disponible en esas fechas.',
  20003: 'El número de huéspedes supera la capacidad de la habitación.',
  20004: 'Debes seleccionar al menos una habitación.',
  20005: 'El monto del pago es insuficiente.',
};

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err);

  const oraCode = extraerCodigoOra(err);
  if (oraCode && MENSAJES_ORA[oraCode]) {
    res.status(409).json({ error: MENSAJES_ORA[oraCode] });
    return;
  }

  res.status(500).json({ error: 'Error interno del servidor.' });
}

function extraerCodigoOra(err: unknown): number | null {
  const mensaje = err instanceof Error ? err.message : String(err);
  const match = /ORA-(\d{5})/.exec(mensaje);
  return match ? Number(match[1]) : null;
}
