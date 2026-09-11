import { Request, Response, NextFunction } from 'express';
import oracledb from 'oracledb';
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

    // Las dos subconsultas escalares dan el rango de tarifa de CADA habitación
    // (varía según la temporada), para poder mostrar "desde $X" en la lista.
    // Son escalares y no un JOIN agregado a propósito: la unicidad
    // (id_habitacion, id_temporada) de TARIFA ya crea un índice cuya primera
    // columna es id_habitacion, así que cada una resuelve por índice en vez de
    // recorrer la tabla entera. Salen NULL si la habitación no tiene tarifas.
    const habitaciones = await conn.execute(
      `SELECT h.id_habitacion, h.numero, h.tipo_habitacion, h.capacidad, h.estado,
              (SELECT MIN(t.valor_noche) FROM tarifa t WHERE t.id_habitacion = h.id_habitacion) AS precio_desde,
              (SELECT MAX(t.valor_noche) FROM tarifa t WHERE t.id_habitacion = h.id_habitacion) AS precio_hasta
       FROM habitacion h
       WHERE h.id_alojamiento = :id AND h.estado = 'DISPONIBLE'
       ORDER BY h.numero`,
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

/**
 * Calendario de precios "desde" por día para un alojamiento: para cada fecha
 * del rango devuelve la temporada a la que pertenece y el valor_noche MÁS
 * BARATO entre sus habitaciones en esa temporada. Con eso el frontend puede
 * pintar el calendario tipo aerolínea (ALTA en rojo, BAJA en verde).
 *
 * Las fechas salen ya formateadas con TO_CHAR desde la base: si se devolvieran
 * como Date de Oracle, el driver las convertiría a la zona horaria del proceso
 * Node y un día podría "correrse" al anterior.
 */
export async function calendarioPrecios(req: Request, res: Response): Promise<void> {
  const idAlojamiento = Number(req.params.id);

  if (!Number.isInteger(idAlojamiento) || idAlojamiento <= 0) {
    res.status(400).json({ error: 'Parámetros inválidos.' });
    return;
  }

  // validarQuery ya aplicó el esquema (formato, orden y tope de días) y dejó
  // los defaults puestos, así que aquí las fechas llegan siempre sanas.
  const { desde, hasta, habitacion } = req.query as unknown as {
    desde: string;
    hasta: string;
    habitacion?: number;
  };
  const idHabitacion = habitacion ?? null;

  const conn = await getConnection();
  try {
    // oracledb no admite dos execute en paralelo sobre la misma conexión, así
    // que las dos comprobaciones previas van en una sola consulta contra DUAL:
    // que el alojamiento exista y que la habitación (si la mandaron) sea suya.
    // Lo segundo importa: sin ello se podría pedir el calendario de la
    // habitación de OTRO alojamiento pasando un id cualquiera.
    const previo = await conn.execute<{ EXISTE_ALOJ: number; EXISTE_HAB: number }>(
      `SELECT (SELECT COUNT(*) FROM alojamiento WHERE id_alojamiento = :idAlojamiento) AS existe_aloj,
              (SELECT COUNT(*) FROM habitacion
                WHERE id_habitacion = :idHabitacion
                  AND id_alojamiento = :idAlojamiento) AS existe_hab
         FROM DUAL`,
      {
        idAlojamiento,
        // Un bind nulo no lleva tipo deducible, hay que declararlo a mano.
        idHabitacion: { val: idHabitacion, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      }
    );

    if (!previo.rows?.[0]?.EXISTE_ALOJ) {
      res.status(404).json({ error: 'Alojamiento no encontrado.' });
      return;
    }

    if (idHabitacion !== null && !previo.rows[0].EXISTE_HAB) {
      res.status(404).json({ error: 'Habitación no encontrada en este alojamiento.' });
      return;
    }

    // Una sola consulta: la serie de días se genera en SQL (CONNECT BY sobre
    // DUAL) y se cruza por LEFT JOIN con la temporada de cada fecha y con el
    // mínimo por temporada de las habitaciones de ESTE alojamiento. Los LEFT
    // JOIN son a propósito: un día sin temporada, o una temporada sin tarifa
    // cargada, debe salir igual en el calendario pero con valores nulos.
    const result = await conn.execute<{
      FECHA: string;
      TEMPORADA: string | null;
      TIPO: string | null;
      VALOR_NOCHE: number | null;
    }>(
      `WITH dias AS (
         SELECT TO_DATE(:desde, 'YYYY-MM-DD') + (LEVEL - 1) AS fecha
         FROM DUAL
         CONNECT BY LEVEL <= TO_DATE(:hasta, 'YYYY-MM-DD') - TO_DATE(:desde, 'YYYY-MM-DD') + 1
       ),
       tarifas_min AS (
         SELECT t.id_temporada, MIN(t.valor_noche) AS valor_noche
         FROM tarifa t
         JOIN habitacion h ON h.id_habitacion = t.id_habitacion
         WHERE h.id_alojamiento = :idAlojamiento
           -- Con habitación concreta el MIN es sobre una sola fila (tarifa es
           -- única por habitación y temporada), así que devuelve su tarifa tal
           -- cual; sin ella, el mínimo del alojamiento: el precio "desde".
           AND (:idHabitacion IS NULL OR t.id_habitacion = :idHabitacion)
         GROUP BY t.id_temporada
       )
       SELECT TO_CHAR(d.fecha, 'YYYY-MM-DD') AS fecha,
              tmp.nombre                     AS temporada,
              tmp.tipo                       AS tipo,
              tar.valor_noche                AS valor_noche
       FROM dias d
       LEFT JOIN temporada tmp
         ON d.fecha BETWEEN TRUNC(tmp.fecha_inicio) AND TRUNC(tmp.fecha_fin)
       LEFT JOIN tarifas_min tar ON tar.id_temporada = tmp.id_temporada
       ORDER BY d.fecha`,
      {
        desde,
        hasta,
        idAlojamiento,
        idHabitacion: { val: idHabitacion, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      }
    );

    const dias = result.rows ?? [];

    // El "desde/hasta" que el frontend usa para pintar la escala de colores:
    // solo cuentan los días con tarifa cargada.
    const valores = dias
      .map((d) => d.VALOR_NOCHE)
      .filter((v): v is number => v !== null && v !== undefined);

    res.json({
      dias,
      resumen: {
        MINIMO: valores.length ? Math.min(...valores) : null,
        MAXIMO: valores.length ? Math.max(...valores) : null,
      },
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

export async function listarTiposAlojamiento(_req: Request, res: Response): Promise<void> {
  const conn = await getConnection();
  try {
    const result = await conn.execute('SELECT id_tipo, nombre FROM tipo_alojamiento ORDER BY nombre');
    res.json(result.rows);
  } finally {
    await conn.close();
  }
}
