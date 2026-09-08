import { Router } from 'express';
import { listarAlojamientos, obtenerAlojamiento, listarMunicipios, listarTiposAlojamiento } from '../controllers/alojamientos.controller';
import { consultarDisponibilidad, crearReserva, obtenerReserva, misReservas } from '../controllers/reservas.controller';
import { iniciarPago, webhookWompi } from '../controllers/pagos.controller';
import { registrarCliente, loginCliente, loginAdmin, logout, quienSoy } from '../controllers/auth.controller';
import { requireCliente, requireAdmin } from '../middleware/auth';
import * as admin from '../controllers/admin.controller';

export const router = Router();

// --- Autenticación ---
router.post('/auth/registro', registrarCliente);
router.post('/auth/login', loginCliente);
router.post('/auth/admin/login', loginAdmin);
router.post('/auth/logout', logout);
router.get('/auth/yo', quienSoy);

// --- Catálogo público ---
router.get('/municipios', listarMunicipios);
router.get('/tipos-alojamiento', listarTiposAlojamiento);
router.get('/alojamientos', listarAlojamientos);
router.get('/alojamientos/:id', obtenerAlojamiento);
router.get('/disponibilidad', consultarDisponibilidad);

// --- Reservas (requieren sesión de cliente) ---
router.post('/reservas', requireCliente, crearReserva);
router.get('/reservas/mias', requireCliente, misReservas);
router.get('/reservas/:id', obtenerReserva);
router.post('/reservas/:id/pago', requireCliente, iniciarPago);

// --- Pagos ---
router.post('/pagos/wompi/webhook', webhookWompi);

// --- Panel de administración (requiere sesión de admin) ---
router.get('/admin/estadisticas', requireAdmin, admin.estadisticas);
router.get('/admin/reservas', requireAdmin, admin.listarReservasAdmin);
router.get('/admin/alojamientos', requireAdmin, admin.listarAlojamientosAdmin);
router.post('/admin/alojamientos', requireAdmin, admin.crearAlojamiento);
router.put('/admin/alojamientos/:id', requireAdmin, admin.actualizarAlojamiento);
router.get('/admin/alojamientos/:idAlojamiento/habitaciones', requireAdmin, admin.listarHabitacionesAdmin);
router.post('/admin/alojamientos/:idAlojamiento/habitaciones', requireAdmin, admin.crearHabitacion);
router.put('/admin/habitaciones/:id', requireAdmin, admin.actualizarHabitacion);
