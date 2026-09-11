import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodIssue } from 'zod';

/**
 * Campos señuelo (honeypot): existen solo para atrapar bots, que rellenan todo
 * lo que encuentran en el formulario. Una persona nunca los ve ni los llena.
 *
 * Sus errores se omiten de la respuesta a propósito. Devolver
 * `{campo: 'sitio', mensaje: '...'}` le estaba diciendo al bot exactamente cuál
 * era la trampa, que es justo lo que no debe saber: basta con dejar ese campo
 * vacío en el siguiente intento para pasar el filtro.
 */
const CAMPOS_SENUELO = new Set(['sitio']);

function detallesPublicos(issues: ZodIssue[]) {
  return issues
    .filter((i) => !CAMPOS_SENUELO.has(i.path.join('.')))
    .map((i) => ({ campo: i.path.join('.'), mensaje: i.message }));
}

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
        detalles: detallesPublicos(resultado.error.issues),
      });
      return;
    }
    req.body = resultado.data;
    next();
  };
}

/**
 * Igual que validarBody pero sobre req.query (parámetros de la URL). Además
 * de cortar con 400 lo que no cumpla, deja en req.query los valores ya
 * normalizados por el esquema (con sus defaults aplicados), para que el
 * controlador no tenga que volver a interpretarlos.
 */
export function validarQuery(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const resultado = schema.safeParse(req.query);
    if (!resultado.success) {
      res.status(400).json({
        error: 'Datos inválidos.',
        detalles: detallesPublicos(resultado.error.issues),
      });
      return;
    }
    // El cast es necesario porque req.query está tipado como ParsedQs; el
    // esquema ya garantizó la forma real de los datos.
    req.query = resultado.data as typeof req.query;
    next();
  };
}
