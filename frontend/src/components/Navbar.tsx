import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar({ sobreImagen = false }: { sobreImagen?: boolean }) {
  const { sesion, logout } = useAuth();
  const navigate = useNavigate();

  async function cerrarSesion() {
    await logout();
    navigate('/');
  }

  // La barra es siempre blanca. En la portada va fija encima de la foto (por
  // eso `sobreImagen` solo cambia el posicionamiento, no los colores).
  const enlace = 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900';
  const boton = 'bg-brand-600 text-white hover:bg-brand-700';

  return (
    <header
      className={`${sobreImagen ? 'fixed' : 'sticky'} inset-x-0 top-0 z-30 border-b border-zinc-200/80 bg-white text-zinc-900 shadow-[0_1px_12px_rgba(0,0,0,0.06)]`}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-2 px-3 sm:h-24 sm:gap-3 sm:px-5 2xl:max-w-7xl">
        <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <img
            src="/logo-turismouq.svg"
            alt=""
            width={64}
            height={64}
            className="h-14 w-14 shrink-0 object-contain sm:h-20 sm:w-20"
          />
          <span className="leading-tight">
            <span className="block text-base font-extrabold tracking-tighter sm:text-xl">TurismoUQ</span>
            <span className="hidden text-xs font-medium text-zinc-500 sm:block">
              Alojamientos en el Quindío
            </span>
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-1 text-sm font-medium sm:gap-2">
          {sesion?.tipo === 'cliente' && (
            <>
              <span className="mr-1 hidden text-zinc-500 md:inline">
                Hola, {sesion.nombre.split(' ')[0]}
              </span>
              <Link to="/mis-reservas" className={`whitespace-nowrap rounded-xl px-3 py-2 transition-colors ${enlace}`}>
                Mis reservas
              </Link>
              <button onClick={cerrarSesion} className={`rounded-xl px-3 py-2 transition-colors ${enlace}`}>Salir</button>
            </>
          )}

          {sesion?.tipo === 'admin' && (
            <>
              <Link to="/admin" className={`whitespace-nowrap rounded-xl px-3 py-2 transition-colors ${enlace}`}>
                Panel admin
              </Link>
              <button onClick={cerrarSesion} className={`rounded-xl px-3 py-2 transition-colors ${enlace}`}>Salir</button>
            </>
          )}

          {!sesion && (
            <>
              <Link to="/login" className={`whitespace-nowrap rounded-xl px-3 py-2 transition-colors ${enlace}`}>
                <span className="sm:hidden">Entrar</span>
                <span className="hidden sm:inline">Iniciar sesión</span>
              </Link>
              <Link
                to="/registro"
                className={`whitespace-nowrap rounded-xl px-3.5 py-2 font-semibold shadow-sm transition-all duration-200 ease-suave active:scale-[0.98] sm:px-4 ${boton}`}
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
