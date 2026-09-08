import { useEffect, useState } from 'react';
import { api, ReservaResumen } from '../api/client';

const COLOR_ESTADO: Record<string, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-800',
  CONFIRMADA: 'bg-emerald-100 text-emerald-800',
  CANCELADA: 'bg-red-100 text-red-800',
  FINALIZADA: 'bg-stone-200 text-stone-700',
};

export default function MisReservas() {
  const [reservas, setReservas] = useState<ReservaResumen[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.misReservas().then(setReservas).catch((e) => setError(e.message)).finally(() => setCargando(false));
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-stone-900">Mis reservas</h1>

      {error && <p className="text-red-600">{error}</p>}
      {cargando && <p className="text-stone-500">Cargando...</p>}
      {!cargando && reservas.length === 0 && <p className="text-stone-500">Todavía no tienes reservas.</p>}

      <div className="space-y-3">
        {reservas.map((r) => (
          <div key={r.ID_RESERVA} className="card flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-stone-900">{r.ALOJAMIENTO} — {r.MUNICIPIO}</p>
              <p className="text-sm text-stone-500">
                Habitación {r.HABITACION} ({r.TIPO_HABITACION}) · {new Date(r.FECHA_CHECKIN).toLocaleDateString('es-CO')} → {new Date(r.FECHA_CHECKOUT).toLocaleDateString('es-CO')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`badge ${COLOR_ESTADO[r.ESTADO] ?? 'bg-stone-100 text-stone-700'}`}>{r.ESTADO}</span>
              <span className="font-semibold text-stone-900">${Number(r.VALOR_TOTAL).toLocaleString('es-CO')}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
