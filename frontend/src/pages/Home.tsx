import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, AlojamientoResumen, Municipio } from '../api/client';
import { Navbar } from '../components/Navbar';

export default function Home() {
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [alojamientos, setAlojamientos] = useState<AlojamientoResumen[]>([]);
  const [municipioFiltro, setMunicipioFiltro] = useState<number | ''>('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listarMunicipios().then(setMunicipios).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    setCargando(true);
    api
      .listarAlojamientos(municipioFiltro ? { municipio: municipioFiltro } : undefined)
      .then(setAlojamientos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [municipioFiltro]);

  return (
    <div>
      <Navbar />

      <section className="bg-gradient-to-br from-brand-800 to-brand-600 py-16 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <h1 className="text-3xl font-bold sm:text-4xl">Encuentra tu próxima estadía en el Quindío</h1>
          <p className="mt-2 max-w-xl text-brand-100">
            Fincas cafeteras, glampings, hoteles y hostales en los 12 municipios del eje cafetero.
          </p>

          <div className="mt-6 flex max-w-md items-center gap-2 rounded-xl bg-white p-2 shadow-lg">
            <span className="pl-2 text-stone-400">📍</span>
            <select
              className="flex-1 bg-transparent px-2 py-2 text-stone-800 focus:outline-none"
              value={municipioFiltro}
              onChange={(e) => setMunicipioFiltro(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Todos los municipios</option>
              {municipios.map((m) => (
                <option key={m.ID_MUNICIPIO} value={m.ID_MUNICIPIO}>{m.NOMBRE}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-10">
        {error && <p className="text-red-600">{error}</p>}

        <h2 className="mb-4 text-lg font-semibold text-stone-900">
          {cargando ? 'Buscando alojamientos...' : `${alojamientos.length} alojamientos disponibles`}
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {alojamientos.map((a) => (
            <Link
              key={a.ID_ALOJAMIENTO}
              to={`/alojamientos/${a.ID_ALOJAMIENTO}`}
              className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-36 items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200 text-4xl">
                {ICONO_TIPO[a.TIPO_ALOJAMIENTO] ?? '🏠'}
              </div>
              <div className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-brand-600">{a.TIPO_ALOJAMIENTO}</p>
                <h3 className="mt-1 font-semibold text-stone-900 group-hover:text-brand-700">{a.NOMBRE}</h3>
                <p className="mt-1 text-sm text-stone-500">{a.MUNICIPIO}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-amber-600">⭐ {Number(a.CALIFICACION_PROMEDIO).toFixed(1)}</span>
                  <span className="text-stone-500">hasta {a.CAPACIDAD_MAX} huéspedes</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {!cargando && alojamientos.length === 0 && (
          <p className="py-12 text-center text-stone-500">No hay alojamientos para ese filtro.</p>
        )}
      </main>
    </div>
  );
}

const ICONO_TIPO: Record<string, string> = {
  'Finca Cafetera': '☕',
  Hotel: '🏨',
  Glamping: '⛺',
  Hostal: '🛏️',
};
