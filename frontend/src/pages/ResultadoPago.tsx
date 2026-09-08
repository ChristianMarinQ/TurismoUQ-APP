import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Navbar } from '../components/Navbar';
import { Cargando, ErrorEstado } from '../components/EstadosUI';

/**
 * Wompi redirige aquí después del checkout. El webhook (servidor a
 * servidor) es la fuente de verdad sobre si el pago quedó aprobado —
 * esta pantalla solo consulta el estado actual de la reserva para
 * mostrárselo al cliente, reintentando unas cuantas veces por si el
 * webhook todavía no ha llegado.
 */
export default function ResultadoPago() {
  const [params] = useSearchParams();
  const idReserva = params.get('reserva');
  const [estado, setEstado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!idReserva) return;

    let intentos = 0;
    const intervalo = setInterval(async () => {
      intentos += 1;
      try {
        const reserva = await api.obtenerReserva(Number(idReserva));
        setEstado(reserva.ESTADO as string);
        if (reserva.ESTADO !== 'PENDIENTE' || intentos >= 10) clearInterval(intervalo);
      } catch (e) {
        setError((e as Error).message);
        clearInterval(intervalo);
      }
    }, 2000);

    return () => clearInterval(intervalo);
  }, [idReserva]);

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold text-stone-900">Resultado del pago</h1>

        {error && <ErrorEstado mensaje={error} />}
        {!error && estado === null && <Cargando mensaje={`Consultando el estado de tu reserva #${idReserva}...`} />}
        {estado === 'CONFIRMADA' && (
          <div className="rounded-xl bg-emerald-50 p-6">
            <p className="text-3xl">✅</p>
            <p className="mt-2 font-medium text-emerald-800">¡Pago aprobado! Tu reserva #{idReserva} quedó confirmada.</p>
          </div>
        )}
        {estado === 'PENDIENTE' && (
          <div className="rounded-xl bg-amber-50 p-6">
            <p className="text-3xl">⏳</p>
            <p className="mt-2 text-amber-800">Tu pago todavía se está procesando. Refresca en un momento.</p>
          </div>
        )}

        <Link to="/mis-reservas" className="btn-primary mt-6 inline-block">Ver mis reservas</Link>
      </main>
    </div>
  );
}
