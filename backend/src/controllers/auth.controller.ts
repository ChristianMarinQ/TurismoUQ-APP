import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import oracledb from 'oracledb';
import { getConnection } from '../config/db';
import { firmarToken, NOMBRE_COOKIE, OPCIONES_COOKIE } from '../utils/jwt';

const RONDAS_BCRYPT = 12;

export async function registrarCliente(req: Request, res: Response, next: NextFunction): Promise<void> {
  const conn = await getConnection();
  try {
    const { nombre, apellido, tipoDocumento, numeroDocumento, email, telefono, password } = req.body as {
      nombre: string; apellido: string; tipoDocumento: string; numeroDocumento: string;
      email: string; telefono?: string; password: string;
    };

    if (!password || password.length < 8) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
      return;
    }

    const existente = await conn.execute<{ ID_CLIENTE: number }>(
      `SELECT id_cliente FROM cliente WHERE email = :email OR (tipo_documento = :td AND numero_documento = :nd)`,
      { email, td: tipoDocumento, nd: numeroDocumento }
    );
    if (existente.rows && existente.rows.length > 0) {
      res.status(409).json({ error: 'Ya existe una cuenta con ese email o documento.' });
      return;
    }

    const clienteInsertado = await conn.execute<{ id_cliente: number[] }>(
      `INSERT INTO cliente (tipo_documento, numero_documento, nombre, apellido, email, telefono)
       VALUES (:td, :nd, :nombre, :apellido, :email, :telefono)
       RETURNING id_cliente INTO :id_cliente`,
      {
        td: tipoDocumento, nd: numeroDocumento, nombre, apellido, email,
        telefono: telefono ?? null,
        id_cliente: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );
    const idCliente = clienteInsertado.outBinds!.id_cliente[0];

    const hash = await bcrypt.hash(password, RONDAS_BCRYPT);
    await conn.execute(
      `INSERT INTO app_credencial_cliente (id_cliente, password_hash) VALUES (:id, :hash)`,
      { id: idCliente, hash }
    );

    await conn.commit();

    const token = firmarToken({ id: idCliente, tipo: 'cliente', nombre: `${nombre} ${apellido}` });
    res.cookie(NOMBRE_COOKIE, token, OPCIONES_COOKIE);
    res.status(201).json({ id: idCliente, nombre: `${nombre} ${apellido}`, tipo: 'cliente' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    await conn.close();
  }
}

export async function loginCliente(req: Request, res: Response, next: NextFunction): Promise<void> {
  const conn = await getConnection();
  try {
    const { email, password } = req.body as { email: string; password: string };

    const resultado = await conn.execute<{ ID_CLIENTE: number; NOMBRE: string; APELLIDO: string; PASSWORD_HASH: string }>(
      `SELECT c.id_cliente, c.nombre, c.apellido, ac.password_hash
       FROM cliente c
       JOIN app_credencial_cliente ac ON ac.id_cliente = c.id_cliente
       WHERE c.email = :email`,
      { email }
    );

    const fila = resultado.rows?.[0];
    const credencialesValidas = fila ? await bcrypt.compare(password, fila.PASSWORD_HASH) : false;

    if (!fila || !credencialesValidas) {
      // Mismo mensaje para "no existe" y "clave incorrecta": no revelar cuál de las dos falló.
      res.status(401).json({ error: 'Email o contraseña incorrectos.' });
      return;
    }

    const nombreCompleto = `${fila.NOMBRE} ${fila.APELLIDO}`;
    const token = firmarToken({ id: fila.ID_CLIENTE, tipo: 'cliente', nombre: nombreCompleto });
    res.cookie(NOMBRE_COOKIE, token, OPCIONES_COOKIE);
    res.json({ id: fila.ID_CLIENTE, nombre: nombreCompleto, tipo: 'cliente' });
  } catch (err) {
    next(err);
  } finally {
    await conn.close();
  }
}

export async function loginAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const conn = await getConnection();
  try {
    const { username, password } = req.body as { username: string; password: string };

    const resultado = await conn.execute<{ ID_ADMIN: number; NOMBRE: string; PASSWORD_HASH: string }>(
      `SELECT id_admin, nombre, password_hash FROM app_usuario_admin WHERE username = :username AND activo = 'S'`,
      { username }
    );

    const fila = resultado.rows?.[0];
    const credencialesValidas = fila ? await bcrypt.compare(password, fila.PASSWORD_HASH) : false;

    if (!fila || !credencialesValidas) {
      res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
      return;
    }

    const token = firmarToken({ id: fila.ID_ADMIN, tipo: 'admin', nombre: fila.NOMBRE });
    res.cookie(NOMBRE_COOKIE, token, OPCIONES_COOKIE);
    res.json({ id: fila.ID_ADMIN, nombre: fila.NOMBRE, tipo: 'admin' });
  } catch (err) {
    next(err);
  } finally {
    await conn.close();
  }
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie(NOMBRE_COOKIE, { path: '/' });
  res.status(204).send();
}

export function quienSoy(req: Request, res: Response): void {
  if (!req.usuario) {
    res.status(401).json({ error: 'No hay sesión activa.' });
    return;
  }
  res.json(req.usuario);
}
