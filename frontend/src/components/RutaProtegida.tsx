import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RutaProtegida({ tipo, children }: { tipo: 'cliente' | 'admin'; children: JSX.Element }) {
  const { sesion, cargando } = useAuth();

  if (cargando) return <div className="p-8 text-center text-stone-500">Cargando...</div>;

  if (!sesion || sesion.tipo !== tipo) {
    return <Navigate to={tipo === 'admin' ? '/admin/login' : '/login'} replace />;
  }

  return children;
}
