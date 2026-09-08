import { Request, Response, NextFunction } from 'express';
import { getConnection } from '../config/db';
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

    const reserva = await conn.execute<{ VALOR_TOTAL: number; ESTADO: string }>(
      `SELECT valor_total, estado FROM reserva WHERE id_reserva = :id`,
      { id: idReserva }
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
    if (transaction.status === 'APPROVED') {
      await conn.execute(
        `INSERT INTO pago (id_reserva, monto, metodo_pago, estado, referencia_pasarela)
         VALUES (:idReserva, :monto, 'WOMPI', 'APROBADO', :referencia)`,
        {
          idReserva,
          monto: transaction.amount_in_cents / 100,
          referencia: transaction.id,
        }
      );
      await conn.execute(`UPDATE reserva SET estado = 'CONFIRMADA' WHERE id_reserva = :id`, { id: idReserva });
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
    await conn.close();
  }
}
