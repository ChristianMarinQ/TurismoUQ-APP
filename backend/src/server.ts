import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { initPool, closePool } from './config/db';
import { router } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { cargarSesion } from './middleware/auth';
import { limiteGeneral } from './middleware/rateLimit';

const PORT = Number(process.env.PORT ?? 4000);
const ES_PRODUCCION = process.env.NODE_ENV === 'production';

async function main(): Promise<void> {
  await initPool();

  const app = express();

  if (ES_PRODUCCION) {
    // Detrás de un proxy/balanceador (nginx, la plataforma de hosting, etc.)
    // para que express-rate-limit vea la IP real del cliente y no la del proxy.
    app.set('trust proxy', 1);
  }

  app.use(helmet()); // cabeceras de seguridad (X-Content-Type-Options, X-Frame-Options, HSTS, etc.)
  app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: '100kb' })); // límite de tamaño: evita peticiones gigantes como vector de DoS
  app.use(cookieParser());
  app.use(cargarSesion);
  app.use('/api', limiteGeneral);

  app.get('/api/salud', (_req, res) => res.json({ ok: true }));
  app.use('/api', router);

  app.use(errorHandler);

  const server = app.listen(PORT, () => {
    console.log(`TurismoUQ-App backend escuchando en http://localhost:${PORT}`);
  });

  const apagar = async (): Promise<void> => {
    server.close();
    await closePool();
    process.exit(0);
  };
  process.on('SIGINT', apagar);
  process.on('SIGTERM', apagar);
}

main().catch((err) => {
  console.error('No se pudo iniciar el servidor:', err);
  process.exit(1);
});
