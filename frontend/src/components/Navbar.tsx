import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { sesion, logout } = useAuth();
  const navigate = useNavigate();

  async function cerrarSesion() {
    await logout();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-lg font-bold text-brand-700 sm:text-xl">
          <span aria-hidden>🏞️</span> TurismoUQ
        </Link>

        <nav className="flex flex-wrap items-center gap-2 text-sm sm:gap-3">
          {sesion?.tipo === 'cliente' && (
            <>
              <Link to="/mis-reservas" className="whitespace-nowrap text-stone-600 hover:text-brand-700">Mis reservas</Link>
              <span className="hidden text-stone-700 sm:inline">Hola, {sesion.nombre.split(' ')[0]}</span>
              <button onClick={cerrarSesion} className="btn-secondary !px-3 !py-1.5">Salir</button>
            </>
          )}

          {sesion?.tipo === 'admin' && (
            <>
              <Link to="/admin" className="whitespace-nowrap text-stone-600 hover:text-brand-700">Panel admin</Link>
              <span className="hidden text-stone-700 sm:inline">{sesion.nombre}</span>
              <button onClick={cerrarSesion} className="btn-secondary !px-3 !py-1.5">Salir</button>
            </>
          )}

          {!sesion && (
            <>
              <Link to="/login" className="whitespace-nowrap text-stone-600 hover:text-brand-700">Iniciar sesión</Link>
              <Link to="/registro" className="btn-primary whitespace-nowrap !px-4 !py-2">Crear cuenta</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
