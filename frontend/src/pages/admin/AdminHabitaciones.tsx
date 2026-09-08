import { useCallback, useEffect, useState, FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, Habitacion } from '../../api/client';
import { Cargando, ErrorEstado, Vacio } from '../../components/EstadosUI';

const TIPOS = ['INDIVIDUAL', 'DOBLE', 'TRIPLE', 'SUITE', 'FAMILIAR'];
const ESTADOS = ['DISPONIBLE', 'MANTENIMIENTO', 'INACTIVA'];

export default function AdminHabitaciones() {
  const { id } = useParams<{ id: string }>();
  const idAlojamiento = Number(id);
  const [habitaciones, setHabitaciones] = useState<Habitacion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [nueva, setNueva] = useState({ numero: '', tipoHabitacion: 'DOBLE', capacidad: 2 });

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    api.adminListarHabitaciones(idAlojamiento)
      .then(setHabitaciones)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [idAlojamiento]);

  useEffect(() => { cargar(); }, [cargar]);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.adminCrearHabitacion(idAlojamiento, nueva);
      setNueva({ numero: '', tipoHabitacion: 'DOBLE', capacidad: 2 });
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function actualizar(h: Habitacion, cambios: Partial<{ tipoHabitacion: string; capacidad: number; estado: string }>) {
    try {
      await api.adminActualizarHabitacion(h.ID_HABITACION, {
        tipoHabitacion: cambios.tipoHabitacion ?? h.TIPO_HABITACION,
        capacidad: cambios.capacidad ?? h.CAPACIDAD,
        estado: cambios.estado ?? h.ESTADO,
      });
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <Link to="/admin/alojamientos" className="mb-4 inline-block text-sm text-brand-700 hover:underline">← Volver a alojamientos</Link>
      <h1 className="mb-6 text-2xl font-bold text-stone-900">Habitaciones</h1>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <form onSubmit={crear} className="card mb-6 flex flex-wrap items-end gap-3 p-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">Número</label>
          <input required className="input-field w-28" value={nueva.numero} onChange={(e) => setNueva({ ...nueva, numero: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">Tipo</label>
          <select className="input-field" value={nueva.tipoHabitacion} onChange={(e) => setNueva({ ...nueva, tipoHabitacion: e.target.value })}>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">Capacidad</label>
          <input type="number" min={1} className="input-field w-24" value={nueva.capacidad} onChange={(e) => setNueva({ ...nueva, capacidad: Number(e.target.value) })} />
        </div>
        <button type="submit" className="btn-primary">+ Agregar habitación</button>
      </form>

      {cargando && <Cargando mensaje="Cargando habitaciones..." />}
      {!cargando && !habitaciones && <ErrorEstado mensaje="No se pudieron cargar las habitaciones." onReintentar={cargar} />}
      {!cargando && habitaciones && habitaciones.length === 0 && (
        <Vacio icono="🛏️" titulo="Este alojamiento no tiene habitaciones todavía" descripcion="Agrega la primera con el formulario de arriba." />
      )}

      {!cargando && habitaciones && habitaciones.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-stone-500">
              <tr>
                <th className="px-4 py-2">Número</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Capacidad</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {habitaciones.map((h) => (
                <tr key={h.ID_HABITACION} className="border-b border-stone-100">
                  <td className="px-4 py-2 font-medium">{h.NUMERO}</td>
                  <td className="px-4 py-2">
                    <select className="input-field !py-1" value={h.TIPO_HABITACION} onChange={(e) => actualizar(h, { tipoHabitacion: e.target.value })}>
                      {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" min={1} className="input-field !py-1 w-20" defaultValue={h.CAPACIDAD}
                           onBlur={(e) => actualizar(h, { capacidad: Number(e.target.value) })} />
                  </td>
                  <td className="px-4 py-2">
                    <select className="input-field !py-1" value={h.ESTADO} onChange={(e) => actualizar(h, { estado: e.target.value })}>
                      {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
