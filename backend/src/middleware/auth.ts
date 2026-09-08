import { Request, Response, NextFunction } from 'express';
import { verificarToken, NOMBRE_COOKIE, PayloadSesion } from '../utils/jwt';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: PayloadSesion;
    }
  }
}

export function cargarSesion(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[NOMBRE_COOKIE];
  if (token) {
    try {
      req.usuario = verificarToken(token);
    } catch {
      // token vencido/inválido -> se ignora, el usuario queda como anónimo
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.usuario) {
    res.status(401).json({ error: 'Debes iniciar sesión.' });
    return;
  }
  next();
}

export function requireCliente(req: Request, res: Response, next: NextFunction): void {
  if (!req.usuario || req.usuario.tipo !== 'cliente') {
    res.status(401).json({ error: 'Debes iniciar sesión como cliente.' });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.usuario || req.usuario.tipo !== 'admin') {
    res.status(403).json({ error: 'Acceso solo para administradores.' });
    return;
  }
  next();
}
