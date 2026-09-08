import oracledb from 'oracledb';

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = false; // cada ruta decide explícitamente cuándo hacer commit

let pool: oracledb.Pool | null = null;

export async function initPool(): Promise<void> {
  if (pool) return;
  pool = await oracledb.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING,
    poolMin: 1,
    poolMax: 10,
    poolIncrement: 1,
  });
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close(10);
    pool = null;
  }
}

export async function getConnection(): Promise<oracledb.Connection> {
  if (!pool) throw new Error('El pool de Oracle no se ha inicializado (llama a initPool primero).');
  return pool.getConnection();
}
