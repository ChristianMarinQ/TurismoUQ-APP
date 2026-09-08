import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin() {
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await loginAdmin(username, password);
      navigate('/admin');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-900 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow-xl">
        <h1 className="text-xl font-bold text-stone-900">Panel de administración</h1>
        <p className="text-sm text-stone-500">Acceso restringido al equipo de TurismoUQ.</p>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <input placeholder="Usuario" required className="input-field" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input type="password" placeholder="Contraseña" required className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} />

        <button type="submit" className="btn-primary w-full" disabled={cargando}>
          {cargando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
