import { Request, Response, NextFunction } from 'express';
import oracledb from 'oracledb';
import { getConnection } from '../config/db';

interface DatosCliente {
  nombre: string;
  apellido: string;
  tipoDocumento: string;
  numeroDocumento: string;
  email: string;
  telefono?: string;
}

async function obtenerOCrearCliente(conn: oracledb.Connection, datos: DatosCliente): Promise<number> {
  const existente = await conn.execute<{ ID_CLIENTE: number }>(
    `SELECT id_cliente FROM cliente WHERE (tipo_documento = :td AND numero_documento = :nd) OR email = :email`,
    { td: datos.tipoDocumento, nd: datos.numeroDocumento, email: datos.email }
  );

  if (existente.rows && existente.rows.length > 0) {
    return existente.rows[0].ID_CLIENTE;
  }

  const insertado = await conn.execute<{ id_cliente: number[] }>(
    `INSERT INTO cliente (tipo_documento, numero_documento, nombre, apellido, email, telefono)
     VALUES (:td, :nd, :nombre, :apellido, :email, :telefono)
     RETURNING id_cliente INTO :id_cliente`,
    {
      td: datos.tipoDocumento,
      nd: datos.numeroDocumento,
      nombre: datos.nombre,
      apellido: datos.apellido,
      email: datos.email,
      telefono: datos.telefono ?? null,
      id_cliente: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    }
  );

  return insertado.outBinds!.id_cliente[0];
}

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
    const { cliente, idHabitacion, numHuespedes, checkin, checkout } = req.body as {
      cliente: DatosCliente;
      idHabitacion: number;
      numHuespedes: number;
      checkin: string;
      checkout: string;
    };

    const idCliente = await obtenerOCrearCliente(conn, cliente);

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
