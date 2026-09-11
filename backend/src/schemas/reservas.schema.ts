import { z } from 'zod';

const fechaISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida, usa YYYY-MM-DD');

/** Un servicio adicional contratado junto con la reserva. */
const servicioSolicitado = z.object({
  idServicio: z.coerce.number().int().positive(),
  cantidad: z.coerce.number().int().positive().max(50),
});

export const crearReservaSchema = z
  .object({
    idHabitacion: z.coerce.number().int().positive(),
    numHuespedes: z.coerce.number().int().positive().max(50),
    checkin: fechaISO,
    checkout: fechaISO,
    // Opcional: una reserva sin extras no manda el campo. El tope de 20 evita
    // que alguien mande una lista enorme y haga trabajar de más al PL/SQL; el
    // resto de reglas (que el servicio sea del alojamiento, el precio, el tope
    // por servicio) las valida pkg_servicios_app, que es donde no se pueden
    // saltar aunque alguien llame a la API por fuera de la interfaz.
    servicios: z.array(servicioSolicitado).max(20).optional(),
  })
  .refine((d) => d.checkout > d.checkin, { message: 'checkout debe ser posterior a checkin', path: ['checkout'] });
