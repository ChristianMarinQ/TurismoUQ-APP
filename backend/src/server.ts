import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { initPool, closePool } from './config/db';
import { router } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { cargarSesion } from './middleware/auth';

const PORT = Number(process.env.PORT ?? 4000);

async function main(): Promise<void> {
  await initPool();

  const app = express();
  app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(cargarSesion);

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
