import { z } from 'zod';

const fechaISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida, usa YYYY-MM-DD');

export const crearReservaSchema = z
  .object({
    idHabitacion: z.coerce.number().int().positive(),
    numHuespedes: z.coerce.number().int().positive().max(50),
    checkin: fechaISO,
    checkout: fechaISO,
  })
  .refine((d) => d.checkout > d.checkin, { message: 'checkout debe ser posterior a checkin', path: ['checkout'] });
