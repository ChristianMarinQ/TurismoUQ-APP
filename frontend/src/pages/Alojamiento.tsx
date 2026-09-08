import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, AlojamientoDetalle, Habitacion } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Cargando, ErrorEstado } from '../components/EstadosUI';

const ICONO_TIPO: Record<string, string> = {
  'Finca Cafetera': '☕', Hotel: '🏨', Glamping: '⛺', Hostal: '🛏️',
};

export default function Alojamiento() {
  const { id } = useParams<{ id: string }>();
  const { sesion } = useAuth();
  const navigate = useNavigate();

  const [alojamiento, setAlojamiento] = useState<AlojamientoDetalle | null>(null);
  const [cargandoAlojamiento, setCargandoAlojamiento] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [habitacionSel, setHabitacionSel] = useState<Habitacion | null>(null);
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [disponible, setDisponible] = useState<boolean | null>(null);
  const [valorEstadia, setValorEstadia] = useState(0);
  const [numHuespedes, setNumHuespedes] = useState(1);
  const [procesando, setProcesando] = useState(false);

  const cargarAlojamiento = useCallback(() => {
    if (!id) return;
    setCargandoAlojamiento(true);
    setErrorCarga(null);
    api.obtenerAlojamiento(Number(id))
      .then(setAlojamiento)
      .catch((e) => setErrorCarga(e.message))
      .finally(() => setCargandoAlojamiento(false));
  }, [id]);

  useEffect(() => { cargarAlojamiento(); }, [cargarAlojamiento]);

  async function verificarDisponibilidad() {
    if (!habitacionSel || !checkin || !checkout) return;
    setError(null);
    try {
      const r = await api.consultarDisponibilidad(habitacionSel.ID_HABITACION, checkin, checkout);
      setDisponible(r.disponible);
      setValorEstadia(r.valorEstadia);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function reservarYPagar() {
    if (!habitacionSel) return;

    if (!sesion) {
      navigate('/login', { state: { desde: `/alojamientos/${id}` } });
      return;
    }

    setProcesando(true);
    setError(null);
    try {
      const { idReserva } = await api.crearReserva({
        idHabitacion: habitacionSel.ID_HABITACION,
        numHuespedes,
        checkin,
        checkout,
      });
      const { urlCheckout } = await api.iniciarPago(idReserva);
      window.location.href = urlCheckout;
    } catch (e) {
      setError((e as Error).message);
      setProcesando(false);
    }
  }

  if (cargandoAlojamiento) {
    return (
      <div>
        <Navbar />
        <Cargando mensaje="Cargando alojamiento..." />
      </div>
    );
  }

  if (errorCarga || !alojamiento) {
    return (
      <div>
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-10">
          <ErrorEstado mensaje={errorCarga ?? 'No se encontró el alojamiento.'} onReintentar={cargarAlojamiento} />
        </main>
      </div>
    );
  }

  return (
    <div>
      <Navbar />

      <div className="flex h-56 items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200 text-6xl">
        {ICONO_TIPO[alojamiento.TIPO_ALOJAMIENTO] ?? '🏠'}
      </div>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-600">{alojamiento.TIPO_ALOJAMIENTO}</p>
        <h1 className="mt-1 text-3xl font-bold text-stone-900">{alojamiento.NOMBRE}</h1>
        <p className="mt-1 text-stone-500">{alojamiento.MUNICIPIO} · {alojamiento.DIRECCION}</p>
        <p className="mt-1 flex items-center gap-1 text-amber-600">⭐ {Number(alojamiento.CALIFICACION_PROMEDIO).toFixed(1)}</p>

        {alojamiento.servicios.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 font-semibold text-stone-900">Servicios</h2>
            <div className="flex flex-wrap gap-2">
              {alojamiento.servicios.map((s) => (
                <span key={s.ID_SERVICIO} className="badge bg-stone-100 text-stone-700">
                  {s.NOMBRE}{Number(s.PRECIO) > 0 && ` · $${Number(s.PRECIO).toLocaleString('es-CO')}`}
                </span>
              ))}
            </div>
          </div>
        )}

        <h2 className="mb-3 mt-8 text-xl font-semibold text-stone-900">Elige una habitación</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alojamiento.habitaciones.map((h) => (
            <button
              key={h.ID_HABITACION}
              onClick={() => { setHabitacionSel(h); setDisponible(null); }}
              className={`card p-4 text-left transition ${habitacionSel?.ID_HABITACION === h.ID_HABITACION ? 'ring-2 ring-brand-600' : 'hover:shadow-md'}`}
            >
              <p className="font-semibold text-stone-900">{h.TIPO_HABITACION}</p>
              <p className="text-sm text-stone-500">Habitación {h.NUMERO} · hasta {h.CAPACIDAD} huéspedes</p>
            </button>
          ))}
        </div>

        {habitacionSel && (
          <section className="card mt-8 p-6">
            <h2 className="mb-4 text-lg font-semibold text-stone-900">Reservar habitación {habitacionSel.NUMERO}</h2>

            {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">Check-in</label>
                <input type="date" className="input-field" value={checkin} onChange={(e) => setCheckin(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">Check-out</label>
                <input type="date" className="input-field" value={checkout} onChange={(e) => setCheckout(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">Huéspedes</label>
                <input
                  type="number" min={1} max={habitacionSel.CAPACIDAD} value={numHuespedes} className="input-field w-24"
                  onChange={(e) => setNumHuespedes(Number(e.target.value))}
                />
              </div>
              <button className="btn-secondary" onClick={verificarDisponibilidad} disabled={!checkin || !checkout}>
                Verificar disponibilidad
              </button>
            </div>

            {disponible === true && (
              <div className="mt-5 rounded-lg bg-emerald-50 p-4">
                <p className="font-medium text-emerald-800">
                  Disponible — valor de la estadía: ${valorEstadia.toLocaleString('es-CO')} COP
                </p>

                {!sesion && (
                  <p className="mt-2 text-sm text-emerald-700">
                    <Link to="/login" state={{ desde: `/alojamientos/${id}` }} className="font-semibold underline">Inicia sesión</Link> o{' '}
                    <Link to="/registro" className="font-semibold underline">crea una cuenta</Link> para completar la reserva.
                  </p>
                )}

                <button className="btn-primary mt-3" onClick={reservarYPagar} disabled={procesando}>
                  {procesando ? 'Procesando...' : `Reservar y pagar $${valorEstadia.toLocaleString('es-CO')}`}
                </button>
              </div>
            )}
            {disponible === false && (
              <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-red-700">Esa habitación no está disponible en esas fechas.</p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
