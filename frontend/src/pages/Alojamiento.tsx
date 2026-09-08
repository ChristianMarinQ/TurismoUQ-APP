import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, AlojamientoDetalle, Habitacion } from '../api/client';

export default function Alojamiento() {
  const { id } = useParams<{ id: string }>();
  const [alojamiento, setAlojamiento] = useState<AlojamientoDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [habitacionSel, setHabitacionSel] = useState<Habitacion | null>(null);
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [disponible, setDisponible] = useState<boolean | null>(null);
  const [valorEstadia, setValorEstadia] = useState(0);
  const [numHuespedes, setNumHuespedes] = useState(1);

  const [cliente, setCliente] = useState({
    nombre: '', apellido: '', tipoDocumento: 'CC', numeroDocumento: '', email: '', telefono: '',
  });
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.obtenerAlojamiento(Number(id)).then(setAlojamiento).catch((e) => setError(e.message));
  }, [id]);

  async function verificarDisponibilidad() {
    if (!habitacionSel || !checkin || !checkout) return;
    setError(null);
    try {
      const r = await api.consultarDisponibilidad(habitacionSel.ID_HABITACION, checkin, checkout);
      setDisponible(r.disponible);
      setValorEstadia(r.valorEstadia);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function reservarYPagar() {
    if (!habitacionSel) return;
    setProcesando(true);
    setError(null);
    try {
      const { idReserva } = await api.crearReserva({
        cliente,
        idHabitacion: habitacionSel.ID_HABITACION,
        numHuespedes,
        checkin,
        checkout,
      });
      const { urlCheckout } = await api.iniciarPago(idReserva);
      window.location.href = urlCheckout;
    } catch (e) {
      setError((e as Error).message);
      setProcesando(false);
    }
  }

  if (error) return <main className="contenedor"><p className="error">{error}</p></main>;
  if (!alojamiento) return <main className="contenedor"><p>Cargando...</p></main>;

  return (
    <main className="contenedor">
      <h1>{alojamiento.NOMBRE}</h1>
      <p>{alojamiento.MUNICIPIO} — {alojamiento.TIPO_ALOJAMIENTO}</p>
      <p>{alojamiento.DIRECCION}</p>

      <h2>Habitaciones</h2>
      <div className="grilla">
        {alojamiento.habitaciones.map((h) => (
          <button
            key={h.ID_HABITACION}
            className={`tarjeta ${habitacionSel?.ID_HABITACION === h.ID_HABITACION ? 'seleccionada' : ''}`}
            onClick={() => { setHabitacionSel(h); setDisponible(null); }}
          >
            <strong>{h.TIPO_HABITACION}</strong>
            <p>Habitación {h.NUMERO} · capacidad {h.CAPACIDAD}</p>
          </button>
        ))}
      </div>

      {habitacionSel && (
        <section className="panel">
          <h2>Reservar habitación {habitacionSel.NUMERO}</h2>

          <div className="fila">
            <label>Check-in <input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} /></label>
            <label>Check-out <input type="date" value={checkout} onChange={(e) => setCheckout(e.target.value)} /></label>
            <label>Huéspedes
              <input
                type="number" min={1} max={habitacionSel.CAPACIDAD} value={numHuespedes}
                onChange={(e) => setNumHuespedes(Number(e.target.value))}
              />
            </label>
            <button onClick={verificarDisponibilidad} disabled={!checkin || !checkout}>Verificar disponibilidad</button>
          </div>

          {disponible === true && (
            <>
              <p className="ok">Disponible — valor de la estadía: ${valorEstadia.toLocaleString('es-CO')} COP</p>

              <h3>Tus datos</h3>
              <div className="fila">
                <input placeholder="Nombre" value={cliente.nombre} onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })} />
                <input placeholder="Apellido" value={cliente.apellido} onChange={(e) => setCliente({ ...cliente, apellido: e.target.value })} />
              </div>
              <div className="fila">
                <select value={cliente.tipoDocumento} onChange={(e) => setCliente({ ...cliente, tipoDocumento: e.target.value })}>
                  <option value="CC">CC</option>
                  <option value="CE">CE</option>
                  <option value="PA">PA</option>
                  <option value="TI">TI</option>
                </select>
                <input placeholder="Número de documento" value={cliente.numeroDocumento} onChange={(e) => setCliente({ ...cliente, numeroDocumento: e.target.value })} />
              </div>
              <div className="fila">
                <input placeholder="Email" type="email" value={cliente.email} onChange={(e) => setCliente({ ...cliente, email: e.target.value })} />
                <input placeholder="Teléfono" value={cliente.telefono} onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })} />
              </div>

              <button className="principal" onClick={reservarYPagar} disabled={procesando}>
                {procesando ? 'Procesando...' : `Reservar y pagar $${valorEstadia.toLocaleString('es-CO')}`}
              </button>
            </>
          )}
          {disponible === false && <p className="error">Esa habitación no está disponible en esas fechas.</p>}
        </section>
      )}
    </main>
  );
}
