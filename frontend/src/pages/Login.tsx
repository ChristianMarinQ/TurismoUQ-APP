import { useState, FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/EstadosUI';
import { VerificacionHumano, reiniciarVerificacion, verificacionActiva } from '../components/VerificacionHumano';

export default function Login() {
  const { loginCliente } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [token, setToken] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await loginCliente(email, password, token);
      toast.success('¡Bienvenido de vuelta!');
      const destino = (location.state as { desde?: string })?.desde ?? '/';
      navigate(destino);
    } catch (err) {
      setError((err as Error).message);
      // El token de Turnstile es de un solo uso: si el intento falla hay que
      // pedir uno nuevo, o el siguiente envío sería rechazado por reutilizado.
      setToken('');
      reiniciarVerificacion();
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-1 text-2xl font-bold text-stone-900">Inicia sesión</h1>
      <p className="mb-6 text-sm text-stone-500">Entra para reservar y ver tu historial.</p>

      <form onSubmit={onSubmit} className="card animate-subir space-y-4 p-6">
        {error && <p className="animate-desplegar rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">Email</label>
          <input type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">Contraseña</label>
          <input type="password" required className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <VerificacionHumano onToken={setToken} />

        <button type="submit" className="btn-primary w-full" disabled={cargando || (verificacionActiva && !token)}>
          {cargando && <Spinner />}
          {cargando ? 'Entrando...' : 'Entrar'}
        </button>
        {verificacionActiva && !token && !cargando && (
          <p className="text-center text-xs text-zinc-400">Completa la verificación para continuar.</p>
        )}
      </form>

      <p className="mt-4 text-center text-sm text-stone-600">
        ¿No tienes cuenta? <Link to="/registro" className="font-medium text-brand-700 hover:underline">Regístrate</Link>
      </p>
    </main>
  );
}
