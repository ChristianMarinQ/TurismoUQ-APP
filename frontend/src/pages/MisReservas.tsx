import { useCallback, useEffect, useState } from 'react';
import { api, ReservaResumen, ReservaDetalle } from '../api/client';
import { Navbar } from '../components/Navbar';
import { EsqueletoLista, ErrorEstado, Vacio } from '../components/EstadosUI';

const COLOR_ESTADO: Record<string, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-800',
  CONFIRMADA: 'bg-emerald-100 text-emerald-800',
  CANCELADA: 'bg-red-100 text-red-800',
  FINALIZADA: 'bg-zinc-200 text-zinc-700',
};

/** Aclara al cliente qué significa el estado, que por sí solo no dice mucho. */
const EXPLICACION_ESTADO: Record<string, string> = {
  PENDIENTE: 'Aún no hemos confirmado el pago.',
  CONFIRMADA: 'Pago confirmado. ¡Te esperamos!',
  CANCELADA: 'Esta reserva fue cancelada.',
  FINALIZADA: 'La estadía ya terminó.',
};

function pesos(valor: number): string {
  return `$${Number(valor).toLocaleString('es-CO')}`;
}

function fecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function nochesEntre(desde: string, hasta: string): number {
  return Math.max(0, Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 86400000));
}

export default function MisReservas() {
  const [reservas, setReservas] = useState<ReservaResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  // Cuál está desplegada, y el detalle ya traído de cada una. El detalle se
  // pide solo al abrir: la lista puede ser larga y no tiene sentido traer los
  // servicios de todas por adelantado.
  const [abierta, setAbierta] = useState<number | null>(null);
  const [detalles, setDetalles] = useState<Record<number, ReservaDetalle>>({});
  const [cargandoDetalle, setCargandoDetalle] = useState<number | null>(null);
  const [errorDetalle, setErrorDetalle] = useState<Record<number, string>>({});

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    api.misReservas().then(setReservas).catch((e) => setError(e.message)).finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function pedirDetalle(id: number) {
    setCargandoDetalle(id);
    setErrorDetalle((previo) => ({ ...previo, [id]: '' }));
    api.obtenerReserva(id)
      .then((d) => setDetalles((previo) => ({ ...previo, [id]: d })))
      .catch((e) => setErrorDetalle((previo) => ({ ...previo, [id]: (e as Error).message })))
      .finally(() => setCargandoDetalle(null));
  }

  function alternar(id: number) {
    if (abierta === id) { setAbierta(null); return; }
    setAbierta(id);
    if (!detalles[id]) pedirDetalle(id);
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-4xl px-5 py-10">
        <h1 className="text-2xl font-bold text-zinc-900">Mis reservas</h1>
        <p className="mt-1 text-sm text-zinc-500">Toca una reserva para ver el detalle de lo que pagaste.</p>

        <div className="mt-6">
          {cargando && <EsqueletoLista />}
          {!cargando && error && <ErrorEstado mensaje={error} onReintentar={cargar} />}
          {!cargando && !error && reservas && reservas.length === 0 && (
            <Vacio icono="🧳" titulo="Todavía no tienes reservas" descripcion="Cuando reserves un alojamiento, aparecerá aquí." />
          )}

          {!cargando && !error && reservas && reservas.length > 0 && (
            <div className="space-y-3">
              {reservas.map((r, i) => {
                const estaAbierta = abierta === r.ID_RESERVA;
                const detalle = detalles[r.ID_RESERVA];
                const fallo = errorDetalle[r.ID_RESERVA];
                const noches = nochesEntre(r.FECHA_CHECKIN, r.FECHA_CHECKOUT);

                // El backend devuelve el total ya sumado; la estadía es lo que
                // queda al descontar los servicios. Así el desglose siempre
                // cuadra con VALOR_TOTAL aunque cambien las tarifas después.
                const totalServicios = detalle
                  ? detalle.servicios.reduce((s, x) => s + Number(x.CANTIDAD) * Number(x.PRECIO_UNITARIO), 0)
                  : 0;
                const estadia = detalle ? Number(detalle.VALOR_TOTAL) - totalServicios : 0;

                return (
                  <div
                    key={r.ID_RESERVA}
                    className="card animate-subir overflow-hidden"
                    style={{ animationDelay: `${Math.min(i, 9) * 40}ms` }}
                  >
                    <button
                      type="button"
                      onClick={() => alternar(r.ID_RESERVA)}
                      aria-expanded={estaAbierta}
                      aria-controls={`detalle-${r.ID_RESERVA}`}
                      className="flex w-full flex-col justify-between gap-3 p-5 text-left transition-colors hover:bg-zinc-50 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-900">{r.ALOJAMIENTO} — {r.MUNICIPIO}</p>
                        <p className="mt-0.5 text-sm text-zinc-500">
                          Habitación {r.HABITACION} ({r.TIPO_HABITACION}) · {fecha(r.FECHA_CHECKIN)} → {fecha(r.FECHA_CHECKOUT)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className={`badge ${COLOR_ESTADO[r.ESTADO] ?? 'bg-zinc-100 text-zinc-700'}`}>{r.ESTADO}</span>
                        <span className="font-semibold text-zinc-900">{pesos(r.VALOR_TOTAL)}</span>
                        <span
                          className={`text-zinc-400 transition-transform duration-200 ease-suave ${estaAbierta ? 'rotate-180' : ''}`}
                          aria-hidden
                        >
                          ▾
                        </span>
                      </div>
                    </button>

                    {estaAbierta && (
                      <div id={`detalle-${r.ID_RESERVA}`} className="animate-desplegar border-t border-zinc-200/80 px-5 py-4">
                        {cargandoDetalle === r.ID_RESERVA && (
                          <div className="space-y-2">
                            <div className="skeleton h-4 w-2/3" />
                            <div className="skeleton h-4 w-1/2" />
                            <div className="skeleton h-4 w-1/3" />
                          </div>
                        )}

                        {fallo && (
                          <ErrorEstado mensaje={fallo} onReintentar={() => pedirDetalle(r.ID_RESERVA)} />
                        )}

                        {detalle && !fallo && cargandoDetalle !== r.ID_RESERVA && (
                          <>
                            <p className="text-xs text-zinc-500">
                              Reserva #{detalle.ID_RESERVA} · {EXPLICACION_ESTADO[detalle.ESTADO] ?? ''}
                            </p>

                            <h3 className="mt-3 text-sm font-semibold text-zinc-900">Resumen de tu compra</h3>

                            <dl className="mt-2 space-y-2 text-sm">
                              <div className="flex items-baseline justify-between gap-3">
                                <dt className="text-zinc-600">
                                  Habitación {detalle.HABITACION}
                                  <span className="text-zinc-400"> · {noches} {noches === 1 ? 'noche' : 'noches'}</span>
                                </dt>
                                <dd className="shrink-0 font-medium text-zinc-900">{pesos(estadia)}</dd>
                              </div>

                              {detalle.servicios.map((s) => (
                                <div key={s.ID_SERVICIO} className="flex items-baseline justify-between gap-3">
                                  <dt className="min-w-0 text-zinc-600">
                                    {s.NOMBRE}
                                    {Number(s.CANTIDAD) > 1 && (
                                      <span className="text-zinc-400"> · {s.CANTIDAD} × {pesos(s.PRECIO_UNITARIO)}</span>
                                    )}
                                  </dt>
                                  <dd className="shrink-0 font-medium text-zinc-900">
                                    {pesos(Number(s.CANTIDAD) * Number(s.PRECIO_UNITARIO))}
                                  </dd>
                                </div>
                              ))}

                              {detalle.servicios.length === 0 && (
                                <p className="text-zinc-400">No contrataste servicios adicionales.</p>
                              )}
                            </dl>

                            <div className="mt-3 flex items-baseline justify-between border-t border-zinc-200 pt-3">
                              <span className="text-sm font-semibold text-zinc-900">Total pagado</span>
                              <span className="text-lg font-extrabold text-zinc-900">{pesos(detalle.VALOR_TOTAL)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
