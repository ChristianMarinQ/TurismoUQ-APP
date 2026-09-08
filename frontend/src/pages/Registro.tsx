import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Registro() {
  const { registrarCliente } = useAuth();
  const navigate = useNavigate();
  const [datos, setDatos] = useState({
    nombre: '', apellido: '', tipoDocumento: 'CC', numeroDocumento: '', email: '', telefono: '', password: '', sitio: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await registrarCliente(datos);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }

  function set<K extends keyof typeof datos>(campo: K, valor: string) {
    setDatos((d) => ({ ...d, [campo]: valor }));
  }

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-12">
      <h1 className="mb-1 text-2xl font-bold text-stone-900">Crea tu cuenta</h1>
      <p className="mb-6 text-sm text-stone-500">Regístrate para reservar alojamientos en el Quindío.</p>

      <form onSubmit={onSubmit} className="card space-y-4 p-6">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Nombre" required className="input-field" value={datos.nombre} onChange={(e) => set('nombre', e.target.value)} />
          <input placeholder="Apellido" required className="input-field" value={datos.apellido} onChange={(e) => set('apellido', e.target.value)} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <select className="input-field col-span-1" value={datos.tipoDocumento} onChange={(e) => set('tipoDocumento', e.target.value)}>
            <option value="CC">CC</option>
            <option value="CE">CE</option>
            <option value="PA">PA</option>
            <option value="TI">TI</option>
          </select>
          <input placeholder="Número de documento" required className="input-field col-span-2" value={datos.numeroDocumento} onChange={(e) => set('numeroDocumento', e.target.value)} />
        </div>

        <input type="email" placeholder="Email" required className="input-field" value={datos.email} onChange={(e) => set('email', e.target.value)} />
        <input placeholder="Teléfono (opcional)" className="input-field" value={datos.telefono} onChange={(e) => set('telefono', e.target.value)} />
        <div>
          <input type="password" placeholder="Contraseña (mínimo 8 caracteres)" required minLength={8} className="input-field" value={datos.password} onChange={(e) => set('password', e.target.value)} />
        </div>

        {/* Honeypot anti-bot: invisible para personas, pero un bot que
            autocompleta el formulario normalmente también lo llena. Si
            llega con contenido, el backend rechaza la petición. */}
        <input
          type="text"
          name="sitio_web"
          value={datos.sitio}
          onChange={(e) => set('sitio', e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />

        <button type="submit" className="btn-primary w-full" disabled={cargando}>
          {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-stone-600">
        ¿Ya tienes cuenta? <Link to="/login" className="font-medium text-brand-700 hover:underline">Inicia sesión</Link>
      </p>
    </main>
  );
}
