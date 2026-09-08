import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const enlaces = [
  { to: '/admin', label: 'Resumen', end: true },
  { to: '/admin/reservas', label: 'Reservas' },
  { to: '/admin/alojamientos', label: 'Alojamientos' },
];

export function AdminLayout() {
  const { sesion, logout } = useAuth();
  const navigate = useNavigate();

  async function salir() {
    await logout();
    navigate('/admin/login');
  }

  return (
    <div className="flex min-h-screen bg-stone-100">
      <aside className="w-60 shrink-0 bg-stone-900 text-stone-100">
        <div className="px-5 py-5 text-lg font-bold">TurismoUQ Admin</div>
        <nav className="flex flex-col gap-1 px-3">
          {enlaces.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand-700 text-white' : 'text-stone-300 hover:bg-stone-800'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 w-60 border-t border-stone-800 p-4 text-sm">
          <p className="mb-2 text-stone-400">{sesion?.nombre}</p>
          <button onClick={salir} className="text-stone-300 hover:text-white">Cerrar sesión</button>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
