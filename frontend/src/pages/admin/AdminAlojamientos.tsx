import { useCallback, useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, Municipio } from '../../api/client';
import { Cargando, ErrorEstado, Vacio } from '../../components/EstadosUI';

interface FilaAlojamiento {
  ID_ALOJAMIENTO: number;
  NOMBRE: string;
  DIRECCION: string;
  CAPACIDAD_MAX: number;
  ESTADO: string;
  MUNICIPIO: string;
  TIPO_ALOJAMIENTO: string;
}

export default function AdminAlojamientos() {
  const [alojamientos, setAlojamientos] = useState<FilaAlojamiento[] | null>(null);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [tipos, setTipos] = useState<{ ID_TIPO: number; NOMBRE: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [nuevo, setNuevo] = useState({ nombre: '', direccion: '', capacidadMax: 4, idMunicipio: 0, idTipo: 0 });

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    api.adminListarAlojamientos()
      .then((r) => setAlojamientos(r as unknown as FilaAlojamiento[]))
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar();
    api.listarMunicipios().then(setMunicipios).catch(() => {});
    api.listarTiposAlojamiento().then(setTipos).catch(() => {});
  }, [cargar]);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.adminCrearAlojamiento(nuevo);
      setMostrarForm(false);
      setNuevo({ nombre: '', direccion: '', capacidadMax: 4, idMunicipio: 0, idTipo: 0 });
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function cambiarEstado(a: FilaAlojamiento) {
    const nuevoEstado = a.ESTADO === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      await api.adminActualizarAlojamiento(a.ID_ALOJAMIENTO, {
        nombre: a.NOMBRE, direccion: a.DIRECCION, capacidadMax: a.CAPACIDAD_MAX, estado: nuevoEstado,
      });
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Alojamientos</h1>
        <button className="btn-primary" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? 'Cancelar' : '+ Nuevo alojamiento'}
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {mostrarForm && (
        <form onSubmit={crear} className="card mb-6 grid grid-cols-2 gap-3 p-5">
          <input placeholder="Nombre" required className="input-field col-span-2" value={nuevo.nombre}
                 onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
          <input placeholder="Dirección" required className="input-field col-span-2" value={nuevo.direccion}
                 onChange={(e) => setNuevo({ ...nuevo, direccion: e.target.value })} />
          <select required className="input-field" value={nuevo.idMunicipio}
                  onChange={(e) => setNuevo({ ...nuevo, idMunicipio: Number(e.target.value) })}>
            <option value={0} disabled>Municipio...</option>
            {municipios.map((m) => <option key={m.ID_MUNICIPIO} value={m.ID_MUNICIPIO}>{m.NOMBRE}</option>)}
          </select>
          <select required className="input-field" value={nuevo.idTipo}
                  onChange={(e) => setNuevo({ ...nuevo, idTipo: Number(e.target.value) })}>
            <option value={0} disabled>Tipo...</option>
            {tipos.map((t) => <option key={t.ID_TIPO} value={t.ID_TIPO}>{t.NOMBRE}</option>)}
          </select>
          <input type="number" min={1} placeholder="Capacidad máxima" required className="input-field col-span-2"
                 value={nuevo.capacidadMax} onChange={(e) => setNuevo({ ...nuevo, capacidadMax: Number(e.target.value) })} />
          <button type="submit" className="btn-primary col-span-2">Crear alojamiento</button>
        </form>
      )}

      {cargando && <Cargando mensaje="Cargando alojamientos..." />}
      {!cargando && !alojamientos && <ErrorEstado mensaje="No se pudieron cargar los alojamientos." onReintentar={cargar} />}
      {!cargando && alojamientos && alojamientos.length === 0 && (
        <Vacio icono="🏨" titulo="Todavía no hay alojamientos" descripcion="Crea el primero con el botón de arriba." />
      )}

      {!cargando && alojamientos && alojamientos.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-stone-500">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Municipio</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Capacidad</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {alojamientos.map((a) => (
                <tr key={a.ID_ALOJAMIENTO} className="border-b border-stone-100">
                  <td className="px-4 py-2 font-medium">{a.NOMBRE}</td>
                  <td className="px-4 py-2">{a.MUNICIPIO}</td>
                  <td className="px-4 py-2">{a.TIPO_ALOJAMIENTO}</td>
                  <td className="px-4 py-2">{a.CAPACIDAD_MAX}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => cambiarEstado(a)}
                      className={`badge ${a.ESTADO === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}
                    >
                      {a.ESTADO}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link to={`/admin/alojamientos/${a.ID_ALOJAMIENTO}/habitaciones`} className="text-brand-700 hover:underline">
                      Habitaciones →
                    </Link>
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
