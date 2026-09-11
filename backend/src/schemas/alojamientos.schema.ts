import { z } from 'zod';

/** Tope de días que se pueden pedir de una sola vez: sin él, alguien podría
 *  pedir 50 años de calendario y hacer que la base genere millones de filas. */
const MAX_DIAS_CALENDARIO = 370;

/** Rango por defecto cuando no se mandan `desde`/`hasta`. */
const DIAS_POR_DEFECTO = 180;

const MILISEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;

/** Fecha de hoy (+ los días que se indiquen) en formato 'YYYY-MM-DD'. */
function fechaRelativaAHoy(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** true si la cadena 'YYYY-MM-DD' es una fecha real (descarta 2026-02-31). */
function esFechaReal(valor: string): boolean {
  const [anio, mes, dia] = valor.split('-').map(Number);
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  return d.getUTCFullYear() === anio && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

function diasDelRango(desde: string, hasta: string): number {
  const inicio = Date.parse(`${desde}T00:00:00Z`);
  const fin = Date.parse(`${hasta}T00:00:00Z`);
  return (fin - inicio) / MILISEGUNDOS_POR_DIA + 1;
}

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida, usa YYYY-MM-DD')
  .refine(esFechaReal, 'Fecha inexistente en el calendario');

export const calendarioQuerySchema = z
  .object({
    desde: fechaISO.default(() => fechaRelativaAHoy(0)),
    hasta: fechaISO.default(() => fechaRelativaAHoy(DIAS_POR_DEFECTO)),
    // Opcional. Sin ella el calendario da el precio "desde" del alojamiento
    // (el mínimo entre sus habitaciones); con ella, la tarifa de esa habitación
    // concreta, que es lo que hace que el precio cambie al elegir una suite en
    // vez de una individual.
    habitacion: z.coerce.number().int().positive().optional(),
  })
  .refine((q) => q.hasta >= q.desde, {
    message: 'hasta debe ser igual o posterior a desde',
    path: ['hasta'],
  })
  // Si alguna fecha ya venía mal, Number.isNaN evita añadir un segundo
  // mensaje encima del que de verdad explica el problema.
  .refine((q) => {
    const dias = diasDelRango(q.desde, q.hasta);
    return Number.isNaN(dias) || dias <= MAX_DIAS_CALENDARIO;
  }, {
    message: `El rango no puede superar ${MAX_DIAS_CALENDARIO} días`,
    path: ['hasta'],
  });
