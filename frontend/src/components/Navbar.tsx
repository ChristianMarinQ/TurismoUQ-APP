import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar({ sobreImagen = false }: { sobreImagen?: boolean }) {
  const { sesion, logout } = useAuth();
  const navigate = useNavigate();

  async function cerrarSesion() {
    await logout();
    navigate('/');
  }

  // Sobre la portada oscura el navbar va transparente con texto claro;
  // en el resto de páginas, blanco con borde inferior.
  const base = sobreImagen
    ? 'absolute inset-x-0 top-0 z-20 text-white'
    : 'sticky top-0 z-20 border-b border-zinc-200/80 bg-white/80 text-zinc-900 backdrop-blur-md';

  const enlace = sobreImagen ? 'text-white/80 hover:text-white' : 'text-zinc-600 hover:text-zinc-900';

  return (
    <header className={base}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-lg font-extrabold tracking-tighter">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-base text-white" aria-hidden>☕</span>
          TurismoUQ
        </Link>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium">
          {sesion?.tipo === 'cliente' && (
            <>
              <Link to="/mis-reservas" className={`whitespace-nowrap transition-colors ${enlace}`}>Mis reservas</Link>
              <span className={`hidden sm:inline ${sobreImagen ? 'text-white/70' : 'text-zinc-500'}`}>
                Hola, {sesion.nombre.split(' ')[0]}
              </span>
              <button onClick={cerrarSesion} className={`transition-colors ${enlace}`}>Salir</button>
            </>
          )}

          {sesion?.tipo === 'admin' && (
            <>
              <Link to="/admin" className={`whitespace-nowrap transition-colors ${enlace}`}>Panel admin</Link>
              <button onClick={cerrarSesion} className={`transition-colors ${enlace}`}>Salir</button>
            </>
          )}

          {!sesion && (
            <>
              <Link to="/login" className={`whitespace-nowrap transition-colors ${enlace}`}>Iniciar sesión</Link>
              <Link
                to="/registro"
                className={`whitespace-nowrap rounded-xl px-4 py-2 font-semibold transition-all duration-200 ease-suave active:scale-[0.98] ${
                  sobreImagen ? 'bg-white text-zinc-900 hover:bg-zinc-100' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                }`}
              >
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
