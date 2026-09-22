import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api, AlojamientoDetalle, HabitacionDetalle } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Cargando, ErrorEstado, Spinner } from '../components/EstadosUI';
import { Foto } from '../components/Foto';
import { CalendarioPrecios } from '../components/CalendarioPrecios';
import { SelectorServicios } from '../components/SelectorServicios';
import { Icono, IconoTipo } from '../components/Icono';
import { ArrowLeft, BedDouble, Star } from 'lucide';
import { fotoAlojamiento, fotoGaleria, fotoHabitacion } from '../lib/imagenes';

/**
 * 'YYYY-MM-DD' -> '14 sep'. Se parte el string a mano porque
 * `new Date('2026-09-14')` se lee como UTC y en Colombia cae un día antes.
 */
function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export default function Alojamiento() {
  const { id } = useParams<{ id: string }>();
  const { sesion } = useAuth();
  const navigate = useNavigate();

  const [alojamiento, setAlojamiento] = useState<AlojamientoDetalle | null>(null);
  const [cargandoAlojamiento, setCargandoAlojamiento] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [habitacionSel, setHabitacionSel] = useState<HabitacionDetalle | null>(null);
  /** Servicios contratados: id_servicio -> cantidad. */
  const [servicios, setServicios] = useState<Map<number, number>>(new Map());
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [disponible, setDisponible] = useState<boolean | null>(null);
  const [valorEstadia, setValorEstadia] = useState(0);
  const [numHuespedes, setNumHuespedes] = useState(1);
  const [procesando, setProcesando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(true);

  /** El calendario manda las dos fechas de golpe; se cierra al completar el rango. */
  function cambiarFechas(nuevoCheckin: string, nuevoCheckout: string) {
    setCheckin(nuevoCheckin);
    setCheckout(nuevoCheckout);
    setDisponible(null);
    if (nuevoCheckin && nuevoCheckout) setMostrarCalendario(false);
  }

  function cambiarServicio(idServicio: number, cantidad: number) {
    setServicios((previo) => {
      // Se crea un Map nuevo en vez de mutar el anterior: React compara por
      // identidad y mutarlo no dispararía el re-render.
      const copia = new Map(previo);
      if (cantidad > 0) copia.set(idServicio, cantidad);
      else copia.delete(idServicio);
      return copia;
    });
  }

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
    setVerificando(true);
    try {
      const r = await api.consultarDisponibilidad(habitacionSel.ID_HABITACION, checkin, checkout);
      setDisponible(r.disponible);
      setValorEstadia(r.valorEstadia);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setVerificando(false);
    }
  }

  async function reservarYPagar() {
    if (!habitacionSel) return;

    if (!sesion) {
      navigate('/login', { state: { desde: `/alojamientos/${id}` } });
      return;
    }

    setProcesando(true);
    try {
      const { idReserva } = await api.crearReserva({
        idHabitacion: habitacionSel.ID_HABITACION,
        numHuespedes,
        checkin,
        checkout,
        // El campo se omite si no se contrató nada: el backend lo tiene como
        // opcional y así no viaja un array vacío.
        ...(servicios.size > 0
          ? { servicios: [...servicios].map(([idServicio, cantidad]) => ({ idServicio, cantidad })) }
          : {}),
      });
      toast.success(`Reserva #${idReserva} creada, te llevamos al pago...`);
      const { urlCheckout } = await api.iniciarPago(idReserva);
      window.location.href = urlCheckout;
    } catch (e) {
      toast.error((e as Error).message);
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
        <main className="mx-auto max-w-2xl px-5 py-16">
          <ErrorEstado mensaje={errorCarga ?? 'No se encontró el alojamiento.'} onReintentar={cargarAlojamiento} />
        </main>
      </div>
    );
  }

  const noches =
    checkin && checkout
      ? Math.max(0, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000))
      : 0;

  // Desglose de los servicios elegidos. El precio se toma del catálogo que ya
  // trajo la ficha; el importe que de verdad se cobra lo recalcula el PL/SQL al
  // crear la reserva, así que esto es una previsualización, no la fuente de la
  // verdad.
  const serviciosContratados = alojamiento.servicios
    .filter((s) => servicios.has(s.ID_SERVICIO))
    .map((s) => {
      const cantidad = servicios.get(s.ID_SERVICIO)!;
      return { ...s, cantidad, subtotal: Number(s.PRECIO) * cantidad };
    });

  const totalConServicios =
    valorEstadia + serviciosContratados.reduce((suma, s) => suma + s.subtotal, 0);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-5 py-8 2xl:max-w-7xl">
        <Link to="/" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900">
          <Icono icono={ArrowLeft} tamano={16} /> Volver a la búsqueda
        </Link>

        {/* Encabezado */}
        <div className="animate-subir">
          <div className="flex flex-wrap items-center gap-3">
            <span className="badge inline-flex items-center gap-1.5 bg-brand-50 text-brand-700">
              <IconoTipo tipo={alojamiento.TIPO_ALOJAMIENTO} /> {alojamiento.TIPO_ALOJAMIENTO}
            </span>
            <span className="flex items-center gap-1 text-sm font-medium text-zinc-900">
              <Icono icono={Star} tamano={15} className="fill-amber-400 text-amber-500" />
              {Number(alojamiento.CALIFICACION_PROMEDIO).toFixed(1)}
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold text-zinc-900 sm:text-4xl">{alojamiento.NOMBRE}</h1>
          <p className="mt-1.5 text-zinc-500">{alojamiento.MUNICIPIO}, Quindío · {alojamiento.DIRECCION}</p>
        </div>

        {/* Galería */}
        <div className="mt-6 grid animate-subir grid-cols-1 gap-3 sm:grid-cols-4 sm:grid-rows-2" style={{ animationDelay: '60ms' }}>
          <div className="overflow-hidden rounded-2xl bg-zinc-100 sm:col-span-2 sm:row-span-2">
            <Foto
              src={fotoAlojamiento(alojamiento.ID_ALOJAMIENTO, alojamiento.TIPO_ALOJAMIENTO)}
              semilla={alojamiento.ID_ALOJAMIENTO}
              alt={alojamiento.NOMBRE}
              eager
              className="h-56 w-full object-cover sm:h-full"
            />
          </div>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="hidden overflow-hidden rounded-2xl bg-zinc-100 sm:block">
              <Foto
                src={fotoGaleria(alojamiento.ID_ALOJAMIENTO, n, alojamiento.TIPO_ALOJAMIENTO)}
                semilla={alojamiento.ID_ALOJAMIENTO * 100 + n}
                alt=""
                className="h-full w-full object-cover transition-transform duration-500 ease-suave hover:scale-105"
              />
            </div>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
          {/* Columna izquierda */}
          <div>
            {alojamiento.servicios.length > 0 && (
              <section className="border-b border-zinc-200/80 pb-8">
                <h2 className="text-xl font-bold text-zinc-900">Lo que ofrece este lugar</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Marca los que quieras añadir a tu reserva; se suman al total.
                </p>
                <SelectorServicios
                  servicios={alojamiento.servicios}
                  seleccion={servicios}
                  onCambio={cambiarServicio}
                />
              </section>
            )}

            <section className="pt-8">
              <h2 className="text-xl font-bold text-zinc-900">Elige tu habitación</h2>
              <p className="mt-1 text-sm text-zinc-500">{alojamiento.habitaciones.length} habitaciones disponibles</p>

              <div className="mt-4 space-y-3">
                {alojamiento.habitaciones.map((h) => {
                  const activa = habitacionSel?.ID_HABITACION === h.ID_HABITACION;
                  return (
                    <button
                      key={h.ID_HABITACION}
                      onClick={() => { setHabitacionSel(h); setDisponible(null); }}
                      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ease-suave active:scale-[0.995] ${
                        activa
                          ? 'border-zinc-900 bg-zinc-50 shadow-suave'
                          : 'border-zinc-200/80 hover:border-zinc-300 hover:shadow-suave'
                      }`}
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                        <Foto src={fotoHabitacion(h.ID_HABITACION, alojamiento.TIPO_ALOJAMIENTO)} semilla={h.ID_HABITACION} alt="" className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-zinc-900">{h.TIPO_HABITACION}</p>
                        <p className="text-sm text-zinc-500">Habitación {h.NUMERO} · hasta {h.CAPACIDAD} huéspedes</p>
                        <p className="mt-1 text-sm">
                          {h.PRECIO_DESDE === null ? (
                            <span className="text-zinc-400">Sin tarifa publicada</span>
                          ) : (
                            <>
                              <span className="font-semibold text-zinc-900">
                                ${Number(h.PRECIO_DESDE).toLocaleString('es-CO')}
                              </span>
                              <span className="text-zinc-500">
                                {' '}/ noche
                                {/* Si el rango tiene dos extremos distintos es porque la
                                    tarifa cambia con la temporada: se avisa para que el
                                    precio del calendario no parezca una contradicción. */}
                                {h.PRECIO_HASTA !== null && Number(h.PRECIO_HASTA) > Number(h.PRECIO_DESDE) &&
                                  ` · hasta $${Number(h.PRECIO_HASTA).toLocaleString('es-CO')} en temporada alta`}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors ${
                          activa ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-300'
                        }`}
                        aria-hidden
                      >
                        {activa && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Panel de reserva (se queda fijo al hacer scroll en escritorio) */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card p-6">
              {!habitacionSel ? (
                <div className="py-6 text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700">
                    <Icono icono={BedDouble} tamano={26} grosor={1.75} />
                  </span>
                  <p className="mt-3 font-semibold text-zinc-900">Elige una habitación</p>
                  <p className="mt-1 text-sm text-zinc-500">Selecciona una para ver el precio de tu estadía.</p>
                </div>
              ) : (
                <div key={habitacionSel.ID_HABITACION} className="animate-desplegar">
                  <p className="text-sm text-zinc-500">Habitación {habitacionSel.NUMERO}</p>
                  <p className="text-lg font-bold text-zinc-900">{habitacionSel.TIPO_HABITACION}</p>

                  <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200">
                    {/* Resumen de fechas: al pulsarlo se despliega el calendario de precios */}
                    <button
                      type="button"
                      onClick={() => setMostrarCalendario((v) => !v)}
                      aria-expanded={mostrarCalendario}
                      className="grid w-full grid-cols-2 text-left transition-colors hover:bg-zinc-50"
                    >
                      <span className="block border-r border-zinc-200 p-3">
                        <span className="etiqueta">Llegada</span>
                        <span className={`block text-sm font-medium ${checkin ? 'text-zinc-900' : 'text-zinc-400'}`}>
                          {checkin ? fechaCorta(checkin) : 'Elegir fechas'}
                        </span>
                      </span>
                      <span className="block p-3">
                        <span className="etiqueta">Salida</span>
                        <span className={`block text-sm font-medium ${checkout ? 'text-zinc-900' : 'text-zinc-400'}`}>
                          {checkout ? fechaCorta(checkout) : '—'}
                        </span>
                      </span>
                    </button>

                    {mostrarCalendario && (
                      <div className="max-h-[28rem] animate-desplegar overflow-y-auto border-t border-zinc-200 p-3">
                        <CalendarioPrecios
                          idAlojamiento={alojamiento.ID_ALOJAMIENTO}
                          idHabitacion={habitacionSel.ID_HABITACION}
                          checkin={checkin}
                          checkout={checkout}
                          onCambio={cambiarFechas}
                        />
                      </div>
                    )}

                    <label className="block border-t border-zinc-200 p-3">
                      <span className="etiqueta">Huéspedes</span>
                      <input
                        type="number" min={1} max={habitacionSel.CAPACIDAD} value={numHuespedes}
                        onChange={(e) => setNumHuespedes(Number(e.target.value))}
                        className="w-full bg-transparent text-sm font-medium text-zinc-900 focus:outline-none"
                      />
                    </label>
                  </div>

                  <button
                    className="btn-secondary mt-3 w-full"
                    onClick={verificarDisponibilidad}
                    disabled={!checkin || !checkout || verificando}
                  >
                    {verificando && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" aria-hidden />}
                    {verificando ? 'Verificando...' : 'Verificar disponibilidad'}
                  </button>

                  {disponible === true && (
                    <div className="mt-5 animate-subir">
                      <dl className="space-y-2 border-t border-zinc-200 pt-4 text-sm">
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="text-zinc-500">
                            Estadía · {noches} {noches === 1 ? 'noche' : 'noches'}
                          </dt>
                          <dd className="font-medium text-zinc-900">${valorEstadia.toLocaleString('es-CO')}</dd>
                        </div>

                        {serviciosContratados.map((s) => (
                          <div key={s.ID_SERVICIO} className="flex items-baseline justify-between gap-3">
                            <dt className="min-w-0 truncate text-zinc-500">
                              {s.NOMBRE}
                              {s.cantidad > 1 && ` × ${s.cantidad}`}
                            </dt>
                            <dd className="shrink-0 font-medium text-zinc-900">
                              ${s.subtotal.toLocaleString('es-CO')}
                            </dd>
                          </div>
                        ))}
                      </dl>

                      <div className="mt-3 flex items-baseline justify-between border-t border-zinc-200 pt-3">
                        <span className="text-sm font-semibold text-zinc-900">Total</span>
                        <span className="text-2xl font-extrabold text-zinc-900">
                          ${totalConServicios.toLocaleString('es-CO')}
                        </span>
                      </div>

                      {!sesion && (
                        <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2.5 text-sm text-zinc-600">
                          <Link to="/login" state={{ desde: `/alojamientos/${id}` }} className="font-semibold text-zinc-900 underline">Inicia sesión</Link>
                          {' '}o{' '}
                          <Link to="/registro" className="font-semibold text-zinc-900 underline">crea una cuenta</Link> para reservar.
                        </p>
                      )}

                      <button className="btn-acento mt-4 w-full" onClick={reservarYPagar} disabled={procesando}>
                        {procesando && <Spinner />}
                        {procesando ? 'Procesando...' : 'Reservar y pagar'}
                      </button>
                      <p className="mt-2 text-center text-xs text-zinc-400">No se te cobra hasta confirmar el pago</p>
                    </div>
                  )}

                  {disponible === false && (
                    <p className="mt-4 animate-subir rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
                      No está disponible en esas fechas. Prueba con otras.
                    </p>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
