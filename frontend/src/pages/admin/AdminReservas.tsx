import { useEffect, useState } from 'react';
import { api } from '../../api/client';

interface FilaReserva {
  ID_RESERVA: number;
  ESTADO: string;
  FECHA_CHECKIN: string;
  FECHA_CHECKOUT: string;
  VALOR_TOTAL: number;
  CLIENTE: string;
  EMAIL: string;
  ALOJAMIENTO: string;
  HABITACION: string;
}

const ESTADOS = ['PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'FINALIZADA'];

export default function AdminReservas() {
  const [reservas, setReservas] = useState<FilaReserva[]>([]);
  const [filtro, setFiltro] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.adminListarReservas(filtro || undefined)
      .then((r) => setReservas(r as unknown as FilaReserva[]))
      .catch((e) => setError(e.message));
  }, [filtro]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Reservas</h1>
        <select className="input-field w-48" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-left text-stone-500">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Alojamiento</th>
              <th className="px-4 py-2">Habitación</th>
              <th className="px-4 py-2">Check-in</th>
              <th className="px-4 py-2">Check-out</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {reservas.map((r) => (
              <tr key={r.ID_RESERVA} className="border-b border-stone-100">
                <td className="px-4 py-2">{r.ID_RESERVA}</td>
                <td className="px-4 py-2">{r.CLIENTE}<br /><span className="text-xs text-stone-400">{r.EMAIL}</span></td>
                <td className="px-4 py-2">{r.ALOJAMIENTO}</td>
                <td className="px-4 py-2">{r.HABITACION}</td>
                <td className="px-4 py-2">{new Date(r.FECHA_CHECKIN).toLocaleDateString('es-CO')}</td>
                <td className="px-4 py-2">{new Date(r.FECHA_CHECKOUT).toLocaleDateString('es-CO')}</td>
                <td className="px-4 py-2">{r.ESTADO}</td>
                <td className="px-4 py-2 text-right">${Number(r.VALOR_TOTAL).toLocaleString('es-CO')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {reservas.length === 0 && <p className="p-4 text-center text-stone-500">No hay reservas con ese filtro.</p>}
      </div>
    </div>
  );
}
