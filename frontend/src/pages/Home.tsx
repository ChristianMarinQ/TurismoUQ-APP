import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, AlojamientoResumen, Municipio } from '../api/client';

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
    <main className="contenedor">
      <h1>TurismoUQ — Alojamientos en el Quindío</h1>

      {error && <p className="error">{error}</p>}

      <div className="filtros">
        <label>
          Municipio:{' '}
          <select
            value={municipioFiltro}
            onChange={(e) => setMunicipioFiltro(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Todos</option>
            {municipios.map((m) => (
              <option key={m.ID_MUNICIPIO} value={m.ID_MUNICIPIO}>
                {m.NOMBRE}
              </option>
            ))}
          </select>
        </label>
      </div>

      {cargando ? (
        <p>Cargando...</p>
      ) : (
        <div className="grilla">
          {alojamientos.map((a) => (
            <Link key={a.ID_ALOJAMIENTO} to={`/alojamientos/${a.ID_ALOJAMIENTO}`} className="tarjeta">
              <h2>{a.NOMBRE}</h2>
              <p>{a.MUNICIPIO} — {a.TIPO_ALOJAMIENTO}</p>
              <p>⭐ {Number(a.CALIFICACION_PROMEDIO).toFixed(1)} · hasta {a.CAPACIDAD_MAX} huéspedes</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
