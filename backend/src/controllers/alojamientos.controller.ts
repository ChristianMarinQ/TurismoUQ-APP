import { Request, Response, NextFunction } from 'express';
import { getConnection } from '../config/db';

export async function listarAlojamientos(req: Request, res: Response, next: NextFunction): Promise<void> {
  const conn = await getConnection();
  try {
    const { municipio, tipo } = req.query;

    const condiciones: string[] = [];
    const binds: Record<string, number> = {};

    if (municipio) {
      condiciones.push('m.id_municipio = :municipio');
      binds.municipio = Number(municipio);
    }
    if (tipo) {
      condiciones.push('t.id_tipo = :tipo');
      binds.tipo = Number(tipo);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const result = await conn.execute(
      `SELECT a.id_alojamiento, a.nombre, a.capacidad_max, a.calificacion_promedio,
              m.nombre AS municipio, t.nombre AS tipo_alojamiento
       FROM alojamiento a
       JOIN municipio m ON m.id_municipio = a.id_municipio
       JOIN tipo_alojamiento t ON t.id_tipo = a.id_tipo
       ${where}
       AND a.estado = 'ACTIVO'
       ORDER BY a.nombre`,
      binds
    );

    res.json(result.rows);
  } finally {
    await conn.close();
  }
}

export async function obtenerAlojamiento(req: Request, res: Response, next: NextFunction): Promise<void> {
  const conn = await getConnection();
  try {
    const id = Number(req.params.id);

    const alojamiento = await conn.execute(
      `SELECT a.id_alojamiento, a.nombre, a.direccion, a.capacidad_max, a.calificacion_promedio,
              m.nombre AS municipio, t.nombre AS tipo_alojamiento
       FROM alojamiento a
       JOIN municipio m ON m.id_municipio = a.id_municipio
       JOIN tipo_alojamiento t ON t.id_tipo = a.id_tipo
       WHERE a.id_alojamiento = :id`,
      { id }
    );

    if (!alojamiento.rows || alojamiento.rows.length === 0) {
      res.status(404).json({ error: 'Alojamiento no encontrado.' });
      return;
    }

    const habitaciones = await conn.execute(
      `SELECT id_habitacion, numero, tipo_habitacion, capacidad, estado
       FROM habitacion
       WHERE id_alojamiento = :id AND estado = 'DISPONIBLE'
       ORDER BY numero`,
      { id }
    );

    const servicios = await conn.execute(
      `SELECT id_servicio, nombre, descripcion, precio FROM servicio WHERE id_alojamiento = :id`,
      { id }
    );

    res.json({
      ...(alojamiento.rows[0] as object),
      habitaciones: habitaciones.rows,
      servicios: servicios.rows,
    });
  } finally {
    await conn.close();
  }
}

export async function listarMunicipios(_req: Request, res: Response): Promise<void> {
  const conn = await getConnection();
  try {
    const result = await conn.execute('SELECT id_municipio, nombre FROM municipio ORDER BY nombre');
    res.json(result.rows);
  } finally {
    await conn.close();
  }
}
