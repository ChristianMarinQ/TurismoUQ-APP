const BASE_URL = '/api';

async function pedir<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE_URL}${ruta}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones,
  });
  if (!resp.ok) {
    const cuerpo = await resp.json().catch(() => ({}));
    throw new Error(cuerpo.error ?? `Error ${resp.status}`);
  }
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

export const api = {
  listarMunicipios: () => pedir<Municipio[]>('/municipios'),
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
  crearReserva: (payload: {
    cliente: { nombre: string; apellido: string; tipoDocumento: string; numeroDocumento: string; email: string; telefono?: string };
    idHabitacion: number;
    numHuespedes: number;
    checkin: string;
    checkout: string;
  }) => pedir<{ idReserva: number; valorTotal: number }>('/reservas', { method: 'POST', body: JSON.stringify(payload) }),
  iniciarPago: (idReserva: number) =>
    pedir<{ urlCheckout: string }>(`/reservas/${idReserva}/pago`, { method: 'POST' }),
  obtenerReserva: (idReserva: number) => pedir<Record<string, unknown>>(`/reservas/${idReserva}`),
};
