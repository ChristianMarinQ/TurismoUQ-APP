import rateLimit from 'express-rate-limit';

/** Login/registro: ventana corta y pocos intentos, para frenar fuerza bruta y spam de cuentas. */
export const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos y vuelve a intentar.' },
});

/** Límite general, más permisivo, para el resto de la API. */
export const limiteGeneral = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Espera un momento.' },
});
