import oracledb from 'oracledb';

/**
 * Fija, en la conexión Oracle que se va a usar para ESTA petición, el
 * contexto que la política de Row-Level Security de RESERVA usa para
 * decidir qué filas son visibles (ver backend/sql/03_contexto_y_rls.sql).
 * Debe llamarse ANTES de cualquier SELECT/UPDATE sobre RESERVA en esa
 * misma conexión.
 *
 * OJO con el ciclo de vida: conn.close() NO cierra la sesión de Oracle, la
 * devuelve al pool para que la reutilice otra petición, y el contexto de
 * aplicación vive en la sesión. Es decir, el contexto SOBREVIVE al close y
 * la siguiente petición que reciba esa misma conexión lo hereda. Por eso
 * cada controlador llama a liberarContexto() antes de soltar la conexión:
 * si mañana alguien agrega una ruta y olvida fijar el contexto, se queda sin
 * ver nada (que es el comportamiento seguro) en vez de heredar el "admin"
 * que dejó, por ejemplo, la ruta pública de disponibilidad.
 */
export async function fijarContextoCliente(conn: oracledb.Connection, idCliente: number): Promise<void> {
  await conn.execute(`BEGIN pkg_contexto_app.set_cliente_actual(:id); END;`, { id: idCliente });
}

export async function fijarContextoAdmin(conn: oracledb.Connection): Promise<void> {
  await conn.execute(`BEGIN pkg_contexto_app.set_admin; END;`);
}

/**
 * Borra el contexto de la sesión antes de devolver la conexión al pool.
 * Va en el `finally` de cada controlador que fijó contexto, y nunca debe
 * tumbar la respuesta: si falla (por ejemplo, la conexión ya murió), se
 * registra y se sigue, porque a esas alturas el trabajo útil ya se hizo.
 */
export async function liberarContexto(conn: oracledb.Connection): Promise<void> {
  try {
    await conn.execute(`BEGIN pkg_contexto_app.limpiar; END;`);
  } catch (err) {
    console.error('No se pudo limpiar el contexto de la conexion:', err);
  }
}
