import { Router } from 'express';
import { listarAlojamientos, obtenerAlojamiento, listarMunicipios } from '../controllers/alojamientos.controller';
import { consultarDisponibilidad, crearReserva, obtenerReserva } from '../controllers/reservas.controller';
import { iniciarPago, webhookWompi } from '../controllers/pagos.controller';

export const router = Router();

router.get('/municipios', listarMunicipios);

router.get('/alojamientos', listarAlojamientos);
router.get('/alojamientos/:id', obtenerAlojamiento);

router.get('/disponibilidad', consultarDisponibilidad);
router.post('/reservas', crearReserva);
router.get('/reservas/:id', obtenerReserva);

router.post('/reservas/:id/pago', iniciarPago);
router.post('/pagos/wompi/webhook', webhookWompi);
