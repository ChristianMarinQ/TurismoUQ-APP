import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, Sesion } from '../api/client';

interface AuthContextValue {
  sesion: Sesion | null;
  cargando: boolean;
  loginCliente: (email: string, password: string) => Promise<void>;
  loginAdmin: (username: string, password: string) => Promise<void>;
  registrarCliente: (payload: Parameters<typeof api.registrarCliente>[0]) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.quienSoy()
      .then(setSesion)
      .catch(() => setSesion(null))
      .finally(() => setCargando(false));
  }, []);

  const value: AuthContextValue = {
    sesion,
    cargando,
    loginCliente: async (email, password) => setSesion(await api.loginCliente(email, password)),
    loginAdmin: async (username, password) => setSesion(await api.loginAdmin(username, password)),
    registrarCliente: async (payload) => setSesion(await api.registrarCliente(payload)),
    logout: async () => {
      await api.logout();
      setSesion(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return ctx;
}
