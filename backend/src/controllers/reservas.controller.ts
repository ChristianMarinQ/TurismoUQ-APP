import { Request, Response, NextFunction } from 'express';
import oracledb from 'oracledb';
import { getConnection } from '../config/db';

export async function consultarDisponibilidad(req: Request, res: Response): Promise<void> {
  const conn = await getConnection();
  try {
    const idHabitacion = Number(req.query.idHabitacion);
    const checkin = String(req.query.checkin);
    const checkout = String(req.query.checkout);

    const conflicto = await conn.execute<{ CANTIDAD: number }>(
      `SELECT COUNT(*) AS cantidad
       FROM reserva_habitacion rh JOIN reserva r ON r.id_reserva = rh.id_reserva
       WHERE rh.id_habitacion = :id
         AND r.estado IN ('PENDIENTE', 'CONFIRMADA')
         AND r.fecha_checkin < TO_DATE(:checkout, 'YYYY-MM-DD')
         AND r.fecha_checkout > TO_DATE(:checkin, 'YYYY-MM-DD')`,
      { id: idHabitacion, checkin, checkout }
    );

    const disponible = (conflicto.rows?.[0]?.CANTIDAD ?? 0) === 0;

    let valorEstadia = 0;
    if (disponible) {
      const valor = await conn.execute<{ VALOR: number }>(
        `SELECT pkg_reservas.fn_valor_estadia(:id, TO_DATE(:checkin, 'YYYY-MM-DD'), TO_DATE(:checkout, 'YYYY-MM-DD')) AS valor FROM DUAL`,
        { id: idHabitacion, checkin, checkout }
      );
      valorEstadia = valor.rows?.[0]?.VALOR ?? 0;
    }

    res.json({ disponible, valorEstadia });
  } finally {
    await conn.close();
  }
}

export async function crearReserva(req: Request, res: Response, next: NextFunction): Promise<void> {
  const conn = await getConnection();
  try {
    const { idHabitacion, numHuespedes, checkin, checkout } = req.body as {
      idHabitacion: number;
      numHuespedes: number;
      checkin: string;
      checkout: string;
    };

    // req.usuario viene del JWT (ver middleware requireCliente): la reserva
    // siempre se crea a nombre de quien tiene la sesión, nunca de un
    // id_cliente que mande el cliente en el body (evitaría que alguien
    // reserve "a nombre de" otro cliente con solo cambiar un número).
    const idCliente = req.usuario!.id;

    const TyItemHabitacion = await conn.getDbObjectClass('TY_ITEM_HABITACION');
    const TyTabHabitaciones = await conn.getDbObjectClass('TY_TAB_HABITACIONES');

    const item = new TyItemHabitacion({ ID_HABITACION: idHabitacion, NUM_HUESPEDES: numHuespedes });
    const tabla = new TyTabHabitaciones([item]);

    const result = await conn.execute(
      `BEGIN
         pkg_reservas.sp_crear_reserva(
           p_id_cliente   => :idCliente,
           p_checkin      => TO_DATE(:checkin, 'YYYY-MM-DD'),
           p_checkout     => TO_DATE(:checkout, 'YYYY-MM-DD'),
           p_habitaciones => :habitaciones,
           p_id_reserva   => :idReserva
         );
         -- La reserva queda PENDIENTE hasta que Wompi confirme el pago.
         UPDATE reserva SET estado = 'PENDIENTE' WHERE id_reserva = :idReserva;
       END;`,
      {
        idCliente,
        checkin,
        checkout,
        habitaciones: tabla,
        idReserva: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );

    const idReserva = (result.outBinds as { idReserva: number[] }).idReserva[0];

    const total = await conn.execute<{ VALOR_TOTAL: number }>(
      `SELECT valor_total FROM reserva WHERE id_reserva = :id`,
      { id: idReserva }
    );

    await conn.commit();

    res.status(201).json({ idReserva, valorTotal: total.rows?.[0]?.VALOR_TOTAL ?? 0 });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    await conn.close();
  }
}

export async function obtenerReserva(req: Request, res: Response): Promise<void> {
  const conn = await getConnection();
  try {
    const id = Number(req.params.id);
    const result = await conn.execute(
      `SELECT r.id_reserva, r.estado, r.fecha_checkin, r.fecha_checkout, r.valor_total,
              c.nombre, c.apellido, a.nombre AS alojamiento, h.numero AS habitacion
       FROM reserva r
       JOIN cliente c ON c.id_cliente = r.id_cliente
       JOIN reserva_habitacion rh ON rh.id_reserva = r.id_reserva
       JOIN habitacion h ON h.id_habitacion = rh.id_habitacion
       JOIN alojamiento a ON a.id_alojamiento = h.id_alojamiento
       WHERE r.id_reserva = :id`,
      { id }
    );

    if (!result.rows || result.rows.length === 0) {
      res.status(404).json({ error: 'Reserva no encontrada.' });
      return;
    }

    res.json(result.rows[0]);
  } finally {
    await conn.close();
  }
}

export async function misReservas(req: Request, res: Response): Promise<void> {
  const conn = await getConnection();
  try {
    const idCliente = req.usuario!.id;
    const result = await conn.execute(
      `SELECT r.id_reserva, r.estado, r.fecha_checkin, r.fecha_checkout, r.valor_total,
              a.nombre AS alojamiento, m.nombre AS municipio, h.numero AS habitacion, h.tipo_habitacion
       FROM reserva r
       JOIN reserva_habitacion rh ON rh.id_reserva = r.id_reserva
       JOIN habitacion h ON h.id_habitacion = rh.id_habitacion
       JOIN alojamiento a ON a.id_alojamiento = h.id_alojamiento
       JOIN municipio m ON m.id_municipio = a.id_municipio
       WHERE r.id_cliente = :idCliente
       ORDER BY r.fecha_checkin DESC`,
      { idCliente }
    );
    res.json(result.rows);
  } finally {
    await conn.close();
  }
}
