import { Request, Response, NextFunction } from 'express';
import oracledb from 'oracledb';
import { getConnection } from '../config/db';
import { fijarContextoAdmin, liberarContexto } from '../utils/contexto';

export async function estadisticas(_req: Request, res: Response): Promise<void> {
  const conn = await getConnection();
  try {
    await fijarContextoAdmin(conn);

    // Secuencial a propósito: una misma conexión de oracledb no admite
    // varias consultas concurrentes (Promise.all aquí causaría errores
    // intermitentes o resultados indefinidos, no una ganancia real de
    // velocidad).
    const reservas = await conn.execute<{ ESTADO: string; CANTIDAD: number }>(
      `SELECT estado, COUNT(*) AS cantidad FROM reserva GROUP BY estado`
    );
    const ingresos = await conn.execute<{ TOTAL: number }>(
      `SELECT NVL(SUM(valor_total), 0) AS total FROM reserva WHERE estado IN ('CONFIRMADA', 'FINALIZADA')`
    );
    const alojamientos = await conn.execute<{ TOTAL: number }>(
      `SELECT COUNT(*) AS total FROM alojamiento WHERE estado = 'ACTIVO'`
    );
    const clientes = await conn.execute<{ TOTAL: number }>(`SELECT COUNT(*) AS total FROM cliente`);

    res.json({
      reservasPorEstado: reservas.rows,
      ingresosTotales: ingresos.rows?.[0]?.TOTAL ?? 0,
      totalAlojamientos: alojamientos.rows?.[0]?.TOTAL ?? 0,
      totalClientes: clientes.rows?.[0]?.TOTAL ?? 0,
    });
  } finally {
    await liberarContexto(conn);
    await conn.close();
  }
}

export async function listarReservasAdmin(req: Request, res: Response): Promise<void> {
  const conn = await getConnection();
  try {
    await fijarContextoAdmin(conn);

    const estado = req.query.estado as string | undefined;
    const binds: Record<string, string> = {};
    let filtro = '';
    if (estado) {
      filtro = 'WHERE r.estado = :estado';
      binds.estado = estado;
    }

    const result = await conn.execute(
      `SELECT r.id_reserva, r.estado, r.fecha_reserva, r.fecha_checkin, r.fecha_checkout, r.valor_total,
              c.nombre || ' ' || c.apellido AS cliente, c.email,
              a.nombre AS alojamiento, h.numero AS habitacion
       FROM reserva r
       JOIN cliente c ON c.id_cliente = r.id_cliente
       JOIN reserva_habitacion rh ON rh.id_reserva = r.id_reserva
       JOIN habitacion h ON h.id_habitacion = rh.id_habitacion
       JOIN alojamiento a ON a.id_alojamiento = h.id_alojamiento
       ${filtro}
       ORDER BY r.fecha_reserva DESC
       FETCH FIRST 200 ROWS ONLY`,
      binds
    );
    res.json(result.rows);
  } finally {
    await liberarContexto(conn);
    await conn.close();
  }
}

export async function listarAlojamientosAdmin(_req: Request, res: Response): Promise<void> {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT a.id_alojamiento, a.nombre, a.direccion, a.capacidad_max, a.estado,
              a.calificacion_promedio, m.id_municipio, m.nombre AS municipio, t.id_tipo, t.nombre AS tipo_alojamiento
       FROM alojamiento a
       JOIN municipio m ON m.id_municipio = a.id_municipio
       JOIN tipo_alojamiento t ON t.id_tipo = a.id_tipo
       ORDER BY a.nombre`
    );
    res.json(result.rows);
  } finally {
    await conn.close();
  }
}

export async function crearAlojamiento(req: Request, res: Response, next: NextFunction): Promise<void> {
  const conn = await getConnection();
  try {
    const { nombre, direccion, capacidadMax, idMunicipio, idTipo } = req.body as {
      nombre: string; direccion: string; capacidadMax: number; idMunicipio: number; idTipo: number;
    };

    const result = await conn.execute<{ id: number[] }>(
      `INSERT INTO alojamiento (nombre, direccion, capacidad_max, id_municipio, id_tipo, estado)
       VALUES (:nombre, :direccion, :capacidadMax, :idMunicipio, :idTipo, 'ACTIVO')
       RETURNING id_alojamiento INTO :id`,
      {
        nombre, direccion, capacidadMax, idMunicipio, idTipo,
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );

    await conn.commit();
    res.status(201).json({ id: result.outBinds!.id[0] });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    await conn.close();
  }
}

export async function actualizarAlojamiento(req: Request, res: Response, next: NextFunction): Promise<void> {
  const conn = await getConnection();
  try {
    const id = Number(req.params.id);
    const { nombre, direccion, capacidadMax, estado } = req.body as {
      nombre: string; direccion: string; capacidadMax: number; estado: string;
    };

    await conn.execute(
      `UPDATE alojamiento
       SET nombre = :nombre, direccion = :direccion, capacidad_max = :capacidadMax, estado = :estado
       WHERE id_alojamiento = :id`,
      { nombre, direccion, capacidadMax, estado, id }
    );
    await conn.commit();
    res.status(204).send();
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    await conn.close();
  }
}

export async function listarHabitacionesAdmin(req: Request, res: Response): Promise<void> {
  const conn = await getConnection();
  try {
    const idAlojamiento = Number(req.params.idAlojamiento);
    const result = await conn.execute(
      `SELECT id_habitacion, numero, tipo_habitacion, capacidad, estado
       FROM habitacion WHERE id_alojamiento = :id ORDER BY numero`,
      { id: idAlojamiento }
    );
    res.json(result.rows);
  } finally {
    await conn.close();
  }
}

export async function crearHabitacion(req: Request, res: Response, next: NextFunction): Promise<void> {
  const conn = await getConnection();
  try {
    const idAlojamiento = Number(req.params.idAlojamiento);
    const { numero, tipoHabitacion, capacidad } = req.body as {
      numero: string; tipoHabitacion: string; capacidad: number;
    };

    const result = await conn.execute<{ id: number[] }>(
      `INSERT INTO habitacion (id_alojamiento, numero, tipo_habitacion, capacidad, estado)
       VALUES (:idAlojamiento, :numero, :tipoHabitacion, :capacidad, 'DISPONIBLE')
       RETURNING id_habitacion INTO :id`,
      { idAlojamiento, numero, tipoHabitacion, capacidad, id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } }
    );

    await conn.commit();
    res.status(201).json({ id: result.outBinds!.id[0] });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    await conn.close();
  }
}

export async function actualizarHabitacion(req: Request, res: Response, next: NextFunction): Promise<void> {
  const conn = await getConnection();
  try {
    const id = Number(req.params.id);
    const { tipoHabitacion, capacidad, estado } = req.body as {
      tipoHabitacion: string; capacidad: number; estado: string;
    };

    await conn.execute(
      `UPDATE habitacion SET tipo_habitacion = :tipoHabitacion, capacidad = :capacidad, estado = :estado
       WHERE id_habitacion = :id`,
      { tipoHabitacion, capacidad, estado, id }
    );
    await conn.commit();
    res.status(204).send();
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    await conn.close();
  }
}
