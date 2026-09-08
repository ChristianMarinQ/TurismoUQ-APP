import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Envuelve un handler async para que cualquier excepción/rechazo se
 * reenvíe a next(err) automáticamente. Sin esto, Express 4 NO captura
 * errores lanzados dentro de una función async: la promesa rechazada
 * queda "unhandled" y, según la configuración de Node, puede tumbar
 * todo el proceso en vez de solo devolver un 500 a esa petición.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
