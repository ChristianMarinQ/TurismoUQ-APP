import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Alojamiento from './pages/Alojamiento';
import ResultadoPago from './pages/ResultadoPago';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/alojamientos/:id" element={<Alojamiento />} />
        <Route path="/pago/resultado" element={<ResultadoPago />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
