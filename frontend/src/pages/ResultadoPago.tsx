import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';

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
    <main className="contenedor">
      <h1>Resultado del pago</h1>
      {error && <p className="error">{error}</p>}
      {!error && estado === null && <p>Consultando el estado de tu reserva #{idReserva}...</p>}
      {estado === 'CONFIRMADA' && <p className="ok">¡Pago aprobado! Tu reserva #{idReserva} quedó confirmada.</p>}
      {estado === 'PENDIENTE' && <p>Tu pago todavía se está procesando. Refresca en un momento.</p>}
      <p><Link to="/">Volver al inicio</Link></p>
    </main>
  );
}
