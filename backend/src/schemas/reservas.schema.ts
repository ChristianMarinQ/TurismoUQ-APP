import { z } from 'zod';

const fechaISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida, usa YYYY-MM-DD');

/** Un servicio adicional contratado junto con la reserva. */
const servicioSolicitado = z.object({
  idServicio: z.coerce.number().int().positive(),
  cantidad: z.coerce.number().int().positive().max(50),
});

/** Hoy a las 00:00 en formato 'YYYY-MM-DD', para comparar como texto. */
function hoyISO(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function nochesEntre(desde: string, hasta: string): number {
  return (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000;
}

/** Tope de noches por reserva y de anticipacion, para acotar peticiones absurdas. */
const MAX_NOCHES = 30;
const MAX_DIAS_ANTICIPACION = 400;

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
  .refine((d) => d.checkout > d.checkin, { message: 'checkout debe ser posterior a checkin', path: ['checkout'] })
  // Las tres reglas de abajo las vuelve a aplicar pkg_reservas (que es donde
  // no se pueden saltar aunque alguien llame a la base por fuera de la API).
  // Aqui sirven para cortar antes de abrir una conexion y para devolver un
  // mensaje concreto en vez de un conflicto generico.
  .refine((d) => d.checkin >= hoyISO(), {
    message: 'No se puede reservar en fechas pasadas',
    path: ['checkin'],
  })
  .refine((d) => nochesEntre(d.checkin, d.checkout) <= MAX_NOCHES, {
    message: `La estadia no puede superar ${MAX_NOCHES} noches`,
    path: ['checkout'],
  })
  .refine((d) => nochesEntre(hoyISO(), d.checkin) <= MAX_DIAS_ANTICIPACION, {
    message: `No se puede reservar con mas de ${MAX_DIAS_ANTICIPACION} dias de anticipacion`,
    path: ['checkin'],
  });
