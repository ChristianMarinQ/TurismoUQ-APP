import { Request, Response, NextFunction } from 'express';
import { getConnection } from '../config/db';
import { fijarContextoCliente, fijarContextoAdmin, liberarContexto } from '../utils/contexto';
import {
  construirUrlCheckout,
  verificarFirmaWebhook,
  extraerIdReservaDeReferencia,
  EventoWompi,
} from '../services/wompi.service';

export async function iniciarPago(req: Request, res: Response, next: NextFunction): Promise<void> {
  const conn = await getConnection();
  try {
    const idReserva = Number(req.params.id);
    const idCliente = req.usuario!.id; // requireCliente ya garantiza que existe
    await fijarContextoCliente(conn, idCliente);

    // Filtrar por id_cliente también en el WHERE (no solo exigir sesión ni
    // confiar solo en el RLS): sin esto, cualquier cliente autenticado
    // podría generar un link de pago para la reserva de OTRO cliente con
    // solo cambiar el id en la URL.
    const reserva = await conn.execute<{ VALOR_TOTAL: number; ESTADO: string }>(
      `SELECT valor_total, estado FROM reserva WHERE id_reserva = :id AND id_cliente = :idCliente`,
      { id: idReserva, idCliente }
    );

    if (!reserva.rows || reserva.rows.length === 0) {
      res.status(404).json({ error: 'Reserva no encontrada.' });
      return;
    }

    if (reserva.rows[0].ESTADO !== 'PENDIENTE') {
      res.status(409).json({ error: `La reserva está en estado ${reserva.rows[0].ESTADO}, no se puede pagar.` });
      return;
    }

    const url = construirUrlCheckout({
      idReserva,
      montoEnPesos: reserva.rows[0].VALOR_TOTAL,
      descripcion: `Reserva TurismoUQ #${idReserva}`,
    });

    res.json({ urlCheckout: url });
  } catch (err) {
    next(err);
  } finally {
    await liberarContexto(conn);
    await conn.close();
  }
}

/**
 * Wompi llama esta ruta cuando el estado de una transacción cambia.
 * Configúrala en tu panel de comercio sandbox como:
 *   https://<tu-dominio-publico>/api/pagos/wompi/webhook
 * (en desarrollo local necesitas un túnel tipo ngrok para que Wompi te
 * pueda alcanzar; localhost no es visible desde internet).
 */
export async function webhookWompi(req: Request, res: Response): Promise<void> {
  const evento = req.body as EventoWompi;

  if (!verificarFirmaWebhook(evento)) {
    res.status(401).json({ error: 'Firma inválida.' });
    return;
  }

  const { transaction } = evento.data;
  const idReserva = extraerIdReservaDeReferencia(transaction.reference);

  if (!idReserva) {
    res.status(400).json({ error: 'Referencia de transacción no reconocida.' });
    return;
  }

  const conn = await getConnection();
  try {
    // El webhook no actúa "como" ningún cliente concreto -- ya se verificó
    // la firma de Wompi arriba, que es la prueba de confianza aquí -- así
    // que necesita ver/actualizar la reserva que sea, identificada por lo
    // que venga en el payload firmado.
    await fijarContextoAdmin(conn);

    // Idempotencia: Wompi reintenta el webhook si no le respondemos a
    // tiempo, así que el mismo transaction.id puede llegar más de una vez.
    // Si ya lo procesamos, no volvemos a insertar el pago.
    const yaProcesado = await conn.execute<{ CANTIDAD: number }>(
      `SELECT COUNT(*) AS cantidad FROM pago WHERE referencia_pasarela = :referencia`,
      { referencia: transaction.id }
    );
    if ((yaProcesado.rows?.[0]?.CANTIDAD ?? 0) > 0) {
      res.status(200).json({ recibido: true, duplicado: true });
      return;
    }

    if (transaction.status === 'APPROVED') {
      // El monto se valida contra lo que la reserva realmente debe, en vez
      // de confiar ciegamente en el que venga en el payload del webhook.
      const reserva = await conn.execute<{ VALOR_TOTAL: number }>(
        `SELECT valor_total FROM reserva WHERE id_reserva = :id`,
        { id: idReserva }
      );
      const valorEsperado = reserva.rows?.[0]?.VALOR_TOTAL;
      const montoRecibido = transaction.amount_in_cents / 100;

      if (valorEsperado === undefined || Math.round(valorEsperado) !== Math.round(montoRecibido)) {
        console.error(`Webhook Wompi: monto no coincide para reserva ${idReserva} (esperado=${valorEsperado}, recibido=${montoRecibido})`);
        res.status(409).json({ error: 'El monto no coincide con el valor de la reserva.' });
        return;
      }

      await conn.execute(
        `INSERT INTO pago (id_reserva, monto, metodo_pago, estado, referencia_pasarela)
         VALUES (:idReserva, :monto, 'WOMPI', 'APROBADO', :referencia)`,
        {
          idReserva,
          monto: montoRecibido,
          referencia: transaction.id,
        }
      );
      // Solo se confirma lo que sigue PENDIENTE: sin esta condicion, un evento
      // que llegara tarde (o repetido con otro transaction.id) podia resucitar
      // una reserva ya CANCELADA y volverla CONFIRMADA.
      await conn.execute(
        `UPDATE reserva SET estado = 'CONFIRMADA' WHERE id_reserva = :id AND estado = 'PENDIENTE'`,
        { id: idReserva }
      );
    } else if (transaction.status === 'DECLINED' || transaction.status === 'ERROR') {
      // La reserva se queda en PENDIENTE: el cliente puede reintentar el pago
      // (mismo patrón que pkg_transacciones.sp_registrar_reserva_pago en la
      // base de datos académica: un pago fallido nunca borra la reserva).
      await conn.execute(
        `INSERT INTO pago (id_reserva, monto, metodo_pago, estado, referencia_pasarela)
         VALUES (:idReserva, :monto, 'WOMPI', 'RECHAZADO', :referencia)`,
        {
          idReserva,
          monto: transaction.amount_in_cents / 100,
          referencia: transaction.id,
        }
      );
    }

    await conn.commit();
    res.status(200).json({ recibido: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error procesando el webhook.' });
  } finally {
    await liberarContexto(conn);
    await conn.close();
  }
}

/**
 * Punto de retorno del checkout de Wompi.
 *
 * Existe solo para sortear el cortafuegos de Wompi: su checkout responde 403 a
 * cualquier URL que contenga "localhost", así que no se le puede pasar la
 * direccion del frontend de desarrollo como `redirect-url`. En su lugar se le
 * da la URL publica del tunel apuntando aqui, y este endpoint reenvia el
 * navegador al frontend real con un 302.
 *
 * No es un "open redirect": el destino sale siempre de FRONTEND_URL, que es
 * configuracion del servidor, y de la URL solo se toma un entero. Si alguien
 * manipula `reserva`, como mucho consigue que el frontend le muestre un 404 de
 * una reserva que no es suya.
 */
export function retornoPago(req: Request, res: Response): void {
  const idReserva = Number(req.query.reserva);
  const destino = `${process.env.FRONTEND_URL}/pago/resultado`;

  if (!Number.isInteger(idReserva) || idReserva <= 0) {
    res.redirect(302, destino);
    return;
  }

  res.redirect(302, `${destino}?reserva=${idReserva}`);
}
