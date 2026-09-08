const BASE_URL = '/api';

async function pedir<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE_URL}${ruta}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // envía/recibe la cookie httpOnly de sesión
    ...opciones,
  });
  if (!resp.ok) {
    const cuerpo = await resp.json().catch(() => ({}));
    throw new Error(cuerpo.error ?? `Error ${resp.status}`);
  }
  if (resp.status === 204) return undefined as T;
  return resp.json() as Promise<T>;
}

export interface Municipio {
  ID_MUNICIPIO: number;
  NOMBRE: string;
}

export interface AlojamientoResumen {
  ID_ALOJAMIENTO: number;
  NOMBRE: string;
  CAPACIDAD_MAX: number;
  CALIFICACION_PROMEDIO: number;
  MUNICIPIO: string;
  TIPO_ALOJAMIENTO: string;
}

export interface Habitacion {
  ID_HABITACION: number;
  NUMERO: string;
  TIPO_HABITACION: string;
  CAPACIDAD: number;
  ESTADO: string;
}

export interface AlojamientoDetalle extends AlojamientoResumen {
  DIRECCION: string;
  habitaciones: Habitacion[];
  servicios: { ID_SERVICIO: number; NOMBRE: string; PRECIO: number }[];
}

export interface Sesion {
  id: number;
  tipo: 'cliente' | 'admin';
  nombre: string;
}

export interface ReservaResumen {
  ID_RESERVA: number;
  ESTADO: string;
  FECHA_CHECKIN: string;
  FECHA_CHECKOUT: string;
  VALOR_TOTAL: number;
  ALOJAMIENTO: string;
  MUNICIPIO: string;
  HABITACION: string;
  TIPO_HABITACION: string;
}

export const api = {
  // --- Auth ---
  registrarCliente: (payload: {
    nombre: string; apellido: string; tipoDocumento: string; numeroDocumento: string;
    email: string; telefono?: string; password: string;
  }) => pedir<Sesion>('/auth/registro', { method: 'POST', body: JSON.stringify(payload) }),
  loginCliente: (email: string, password: string) =>
    pedir<Sesion>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  loginAdmin: (username: string, password: string) =>
    pedir<Sesion>('/auth/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => pedir<void>('/auth/logout', { method: 'POST' }),
  quienSoy: () => pedir<Sesion>('/auth/yo'),

  // --- Catálogo público ---
  listarMunicipios: () => pedir<Municipio[]>('/municipios'),
  listarTiposAlojamiento: () => pedir<{ ID_TIPO: number; NOMBRE: string }[]>('/tipos-alojamiento'),
  listarAlojamientos: (params?: { municipio?: number; tipo?: number }) => {
    const qs = new URLSearchParams();
    if (params?.municipio) qs.set('municipio', String(params.municipio));
    if (params?.tipo) qs.set('tipo', String(params.tipo));
    const query = qs.toString();
    return pedir<AlojamientoResumen[]>(`/alojamientos${query ? `?${query}` : ''}`);
  },
  obtenerAlojamiento: (id: number) => pedir<AlojamientoDetalle>(`/alojamientos/${id}`),
  consultarDisponibilidad: (idHabitacion: number, checkin: string, checkout: string) =>
    pedir<{ disponible: boolean; valorEstadia: number }>(
      `/disponibilidad?idHabitacion=${idHabitacion}&checkin=${checkin}&checkout=${checkout}`
    ),

  // --- Reservas (cliente autenticado) ---
  crearReserva: (payload: { idHabitacion: number; numHuespedes: number; checkin: string; checkout: string }) =>
    pedir<{ idReserva: number; valorTotal: number }>('/reservas', { method: 'POST', body: JSON.stringify(payload) }),
  misReservas: () => pedir<ReservaResumen[]>('/reservas/mias'),
  iniciarPago: (idReserva: number) =>
    pedir<{ urlCheckout: string }>(`/reservas/${idReserva}/pago`, { method: 'POST' }),
  obtenerReserva: (idReserva: number) => pedir<Record<string, unknown>>(`/reservas/${idReserva}`),

  // --- Admin ---
  adminEstadisticas: () =>
    pedir<{
      reservasPorEstado: { ESTADO: string; CANTIDAD: number }[];
      ingresosTotales: number;
      totalAlojamientos: number;
      totalClientes: number;
    }>('/admin/estadisticas'),
  adminListarReservas: (estado?: string) =>
    pedir<Record<string, unknown>[]>(`/admin/reservas${estado ? `?estado=${estado}` : ''}`),
  adminListarAlojamientos: () => pedir<Record<string, unknown>[]>('/admin/alojamientos'),
  adminCrearAlojamiento: (payload: { nombre: string; direccion: string; capacidadMax: number; idMunicipio: number; idTipo: number }) =>
    pedir<{ id: number }>('/admin/alojamientos', { method: 'POST', body: JSON.stringify(payload) }),
  adminActualizarAlojamiento: (id: number, payload: { nombre: string; direccion: string; capacidadMax: number; estado: string }) =>
    pedir<void>(`/admin/alojamientos/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  adminListarHabitaciones: (idAlojamiento: number) =>
    pedir<Habitacion[]>(`/admin/alojamientos/${idAlojamiento}/habitaciones`),
  adminCrearHabitacion: (idAlojamiento: number, payload: { numero: string; tipoHabitacion: string; capacidad: number }) =>
    pedir<{ id: number }>(`/admin/alojamientos/${idAlojamiento}/habitaciones`, { method: 'POST', body: JSON.stringify(payload) }),
  adminActualizarHabitacion: (id: number, payload: { tipoHabitacion: string; capacidad: number; estado: string }) =>
    pedir<void>(`/admin/habitaciones/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
};
