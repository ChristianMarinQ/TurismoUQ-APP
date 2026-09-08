import { Router } from 'express';
import { listarAlojamientos, obtenerAlojamiento, listarMunicipios, listarTiposAlojamiento } from '../controllers/alojamientos.controller';
import { consultarDisponibilidad, crearReserva, obtenerReserva, misReservas } from '../controllers/reservas.controller';
import { iniciarPago, webhookWompi } from '../controllers/pagos.controller';
import { registrarCliente, loginCliente, loginAdmin, logout, quienSoy } from '../controllers/auth.controller';
import { requireCliente, requireAdmin } from '../middleware/auth';
import { validarBody } from '../middleware/validate';
import { limiteAuth } from '../middleware/rateLimit';
import { asyncHandler } from '../utils/asyncHandler';
import { registroSchema, loginClienteSchema, loginAdminSchema } from '../schemas/auth.schema';
import { crearReservaSchema } from '../schemas/reservas.schema';
import {
  crearAlojamientoSchema, actualizarAlojamientoSchema, crearHabitacionSchema, actualizarHabitacionSchema,
} from '../schemas/admin.schema';
import * as admin from '../controllers/admin.controller';

export const router = Router();

// --- Autenticación (con límite de intentos para frenar fuerza bruta/spam) ---
router.post('/auth/registro', limiteAuth, validarBody(registroSchema), asyncHandler(registrarCliente));
router.post('/auth/login', limiteAuth, validarBody(loginClienteSchema), asyncHandler(loginCliente));
router.post('/auth/admin/login', limiteAuth, validarBody(loginAdminSchema), asyncHandler(loginAdmin));
router.post('/auth/logout', logout);
router.get('/auth/yo', quienSoy);

// --- Catálogo público (de solo lectura, sin datos sensibles) ---
router.get('/municipios', asyncHandler(listarMunicipios));
router.get('/tipos-alojamiento', asyncHandler(listarTiposAlojamiento));
router.get('/alojamientos', asyncHandler(listarAlojamientos));
router.get('/alojamientos/:id', asyncHandler(obtenerAlojamiento));
router.get('/disponibilidad', asyncHandler(consultarDisponibilidad));

// --- Reservas ---
// crearReserva e iniciarPago exigen sesión de cliente; obtenerReserva exige
// sesión (cliente dueño o admin) y lo valida dentro del propio controlador.
router.post('/reservas', requireCliente, validarBody(crearReservaSchema), asyncHandler(crearReserva));
router.get('/reservas/mias', requireCliente, asyncHandler(misReservas));
router.get('/reservas/:id', asyncHandler(obtenerReserva));
router.post('/reservas/:id/pago', requireCliente, asyncHandler(iniciarPago));

// --- Pagos (Wompi llama esta ruta servidor-a-servidor, autenticada por firma) ---
router.post('/pagos/wompi/webhook', asyncHandler(webhookWompi));

// --- Panel de administración (requiere sesión de admin) ---
router.get('/admin/estadisticas', requireAdmin, asyncHandler(admin.estadisticas));
router.get('/admin/reservas', requireAdmin, asyncHandler(admin.listarReservasAdmin));
router.get('/admin/alojamientos', requireAdmin, asyncHandler(admin.listarAlojamientosAdmin));
router.post('/admin/alojamientos', requireAdmin, validarBody(crearAlojamientoSchema), asyncHandler(admin.crearAlojamiento));
router.put('/admin/alojamientos/:id', requireAdmin, validarBody(actualizarAlojamientoSchema), asyncHandler(admin.actualizarAlojamiento));
router.get('/admin/alojamientos/:idAlojamiento/habitaciones', requireAdmin, asyncHandler(admin.listarHabitacionesAdmin));
router.post('/admin/alojamientos/:idAlojamiento/habitaciones', requireAdmin, validarBody(crearHabitacionSchema), asyncHandler(admin.crearHabitacion));
router.put('/admin/habitaciones/:id', requireAdmin, validarBody(actualizarHabitacionSchema), asyncHandler(admin.actualizarHabitacion));
