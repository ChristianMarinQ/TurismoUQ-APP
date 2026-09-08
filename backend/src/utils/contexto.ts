import oracledb from 'oracledb';

/**
 * Fija, en la conexión Oracle que se va a usar para ESTA petición, el
 * contexto que la política de Row-Level Security de RESERVA usa para
 * decidir qué filas son visibles (ver backend/sql/03_contexto_y_rls.sql).
 * Debe llamarse ANTES de cualquier SELECT/UPDATE sobre RESERVA en esa
 * misma conexión. Como cada request pide su propia conexión al pool y la
 * cierra al terminar (ver getConnection()/conn.close() en cada
 * controlador), el contexto de una petición nunca se filtra a otra.
 */
export async function fijarContextoCliente(conn: oracledb.Connection, idCliente: number): Promise<void> {
  await conn.execute(`BEGIN pkg_contexto_app.set_cliente_actual(:id); END;`, { id: idCliente });
}

export async function fijarContextoAdmin(conn: oracledb.Connection): Promise<void> {
  await conn.execute(`BEGIN pkg_contexto_app.set_admin; END;`);
}
