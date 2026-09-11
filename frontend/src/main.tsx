import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { RutaProtegida } from './components/RutaProtegida';
import { AdminLayout } from './components/AdminLayout';

import Home from './pages/Home';
import Alojamiento from './pages/Alojamiento';
import ResultadoPago from './pages/ResultadoPago';
import Login from './pages/Login';
import Registro from './pages/Registro';
import MisReservas from './pages/MisReservas';

import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminReservas from './pages/admin/AdminReservas';
import AdminAlojamientos from './pages/admin/AdminAlojamientos';
import AdminHabitaciones from './pages/admin/AdminHabitaciones';

import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{ style: { fontFamily: 'inherit' } }}
        />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/alojamientos/:id" element={<Alojamiento />} />
          <Route path="/pago/resultado" element={<ResultadoPago />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/mis-reservas" element={<RutaProtegida tipo="cliente"><MisReservas /></RutaProtegida>} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<RutaProtegida tipo="admin"><AdminLayout /></RutaProtegida>}>
            <Route index element={<AdminDashboard />} />
            <Route path="reservas" element={<AdminReservas />} />
            <Route path="alojamientos" element={<AdminAlojamientos />} />
            <Route path="alojamientos/:id/habitaciones" element={<AdminHabitaciones />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
