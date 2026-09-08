/**
 * Crea (o actualiza la clave de) un usuario administrador para el panel.
 * Uso:
 *   npx ts-node scripts/crear-admin.ts <username> <password> "<Nombre visible>"
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { initPool, getConnection, closePool } from '../src/config/db';

async function main() {
  const [username, password, nombre] = process.argv.slice(2);
  if (!username || !password || !nombre) {
    console.error('Uso: npx ts-node scripts/crear-admin.ts <username> <password> "<Nombre visible>"');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  await initPool();
  const conn = await getConnection();
  try {
    const hash = await bcrypt.hash(password, 12);

    const existente = await conn.execute<{ ID_ADMIN: number }>(
      `SELECT id_admin FROM app_usuario_admin WHERE username = :username`,
      { username }
    );

    if (existente.rows && existente.rows.length > 0) {
      await conn.execute(`UPDATE app_usuario_admin SET password_hash = :hash, nombre = :nombre WHERE username = :username`, {
        hash, nombre, username,
      });
      console.log(`Actualizada la clave del admin existente "${username}".`);
    } else {
      await conn.execute(
        `INSERT INTO app_usuario_admin (username, password_hash, nombre) VALUES (:username, :hash, :nombre)`,
        { username, hash, nombre }
      );
      console.log(`Creado el admin "${username}".`);
    }

    await conn.commit();
  } finally {
    await conn.close();
    await closePool();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
