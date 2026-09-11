import { NextFunction, Request, Response } from 'express';

/** Traduce los ORA-2000x de negocio (ver pkg_reservas) a mensajes legibles. */
const MENSAJES_ORA: Record<number, string> = {
  20001: 'La fecha de salida debe ser posterior a la de llegada.',
  20002: 'Esa habitación ya no está disponible en esas fechas.',
  20003: 'El número de huéspedes supera la capacidad de la habitación.',
  20004: 'Debes seleccionar al menos una habitación.',
  20005: 'El monto del pago es insuficiente.',
  // Servicios adicionales (ver pkg_servicios_app, sql/05_servicios_reserva.sql)
  20011: 'No encontramos esa reserva a tu nombre.',
  20012: 'Solo se pueden agregar servicios a una reserva pendiente de pago.',
  20013: 'Uno de los servicios no pertenece a este alojamiento.',
  20014: 'La cantidad pedida de un servicio no es válida.',
};

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err);

  const oraCode = extraerCodigoOra(err);
  if (oraCode && MENSAJES_ORA[oraCode]) {
    res.status(409).json({ error: MENSAJES_ORA[oraCode] });
    return;
  }

  // ORA-00001: se violó una restricción UNIQUE. Pasa cuando dos registros
  // simultáneos superan la comprobación previa de duplicados y ambos llegan al
  // INSERT: la base impide el duplicado, pero antes esto salía como un 500
  // "Error interno" y el usuario no entendía nada. Es un conflicto, no un fallo
  // del servidor. El mensaje es genérico a propósito: aquí no se sabe qué
  // restricción saltó, y detallarlo permitiría averiguar qué correos o
  // documentos ya están registrados.
  if (oraCode === 1) {
    res.status(409).json({ error: 'Ya existe un registro con esos datos.' });
    return;
  }

  res.status(500).json({ error: 'Error interno del servidor.' });
}

function extraerCodigoOra(err: unknown): number | null {
  const mensaje = err instanceof Error ? err.message : String(err);
  const match = /ORA-(\d{5})/.exec(mensaje);
  return match ? Number(match[1]) : null;
}
