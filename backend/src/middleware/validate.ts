import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny } from 'zod';

/**
 * Valida req.body contra un esquema zod ANTES de que llegue a ningún
 * controlador. Si no cumple, corta con 400 y nunca toca la base de
 * datos ni pkg_reservas — así un tipo/forma inesperada no puede
 * provocar un error a mitad de una operación (mitiga mass-assignment
 * y reduce la superficie de errores no controlados).
 */
export function validarBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const resultado = schema.safeParse(req.body);
    if (!resultado.success) {
      res.status(400).json({
        error: 'Datos inválidos.',
        detalles: resultado.error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
      });
      return;
    }
    req.body = resultado.data;
    next();
  };
}
