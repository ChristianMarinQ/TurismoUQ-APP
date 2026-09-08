import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Cargando, ErrorEstado } from '../../components/EstadosUI';

interface Stats {
  reservasPorEstado: { ESTADO: string; CANTIDAD: number }[];
  ingresosTotales: number;
  totalAlojamientos: number;
  totalClientes: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    api.adminEstadisticas().then(setStats).catch((e) => setError(e.message)).finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) return <Cargando mensaje="Cargando estadísticas..." />;
  if (error || !stats) return <ErrorEstado mensaje={error ?? 'No se pudieron cargar las estadísticas.'} onReintentar={cargar} />;

  const tarjetas = [
    { label: 'Ingresos (confirmados)', valor: `$${Number(stats.ingresosTotales).toLocaleString('es-CO')}` },
    { label: 'Alojamientos activos', valor: stats.totalAlojamientos },
    { label: 'Clientes registrados', valor: stats.totalClientes },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-stone-900">Resumen</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {tarjetas.map((t) => (
          <div key={t.label} className="card p-5">
            <p className="text-sm text-stone-500">{t.label}</p>
            <p className="mt-1 text-2xl font-bold text-stone-900">{t.valor}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-stone-900">Reservas por estado</h2>
        {stats.reservasPorEstado.length === 0 ? (
          <p className="text-sm text-stone-500">Todavía no hay reservas registradas.</p>
        ) : (
          <div className="space-y-2">
            {stats.reservasPorEstado.map((r) => (
              <div key={r.ESTADO} className="flex items-center justify-between text-sm">
                <span className="text-stone-600">{r.ESTADO}</span>
                <span className="font-semibold text-stone-900">{r.CANTIDAD}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
