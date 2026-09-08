# TurismoUQ-App

Aplicación funcional (con interfaz) que consume la misma base de datos Oracle del proyecto académico [`TurismoUQ`](../TurismoUQ) — reservas con pago real vía **Wompi (sandbox)**. Este proyecto es aparte del entregable de Bases de Datos II (que no lleva interfaz); aquí sí hay frontend y backend.

- **Backend**: Node.js + TypeScript + Express, conectado a Oracle con `oracledb` (modo *thin*, sin necesitar Oracle Instant Client). Llama directamente a `pkg_reservas` (el paquete PL/SQL de la Entrega 2) para crear reservas.
- **Frontend**: React + TypeScript + Vite.
- **Pagos**: Wompi Web Checkout (redirect) en modo sandbox — sin dinero real.

## Requisitos

- Node.js 18+ (ya tienes v20.11 instalado).
- La base de datos `TurismoUQ` corriendo y con las Entregas 1 y 2 ya aplicadas (necesita `pkg_reservas`, los tipos `ty_item_habitacion`/`ty_tab_habitaciones`, y las tablas con datos).
- Una cuenta de comercio de pruebas (sandbox) en Wompi — ver más abajo.

## Configurar y correr

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edita `.env` con:
- La clave real de tu usuario `turismouq` (la misma del proyecto de base de datos).
- Tus llaves de sandbox de Wompi (ver sección siguiente).

```bash
npm run dev
```

Debe quedar escuchando en `http://localhost:4000`. Prueba con `http://localhost:4000/api/salud`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Conseguir llaves de Wompi (sandbox)

1. Crea una cuenta en https://comercios.wompi.co/ (o en el portal de sandbox de Wompi para desarrolladores).
2. En el panel, busca la sección de **Desarrolladores / API Keys** en modo **Sandbox/Pruebas**.
3. Copia la **llave pública** (`pub_test_...`), el **secreto de integridad** y el **secreto de eventos** — van en `backend/.env` como `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET` y `WOMPI_EVENTS_SECRET`.
4. Wompi tiene tarjetas de prueba documentadas (aprobada / rechazada) para probar el checkout sin dinero real.
5. Para que el **webhook** (`/api/pagos/wompi/webhook`) funcione en desarrollo local, Wompi necesita poder alcanzar tu servidor — localhost no es visible desde internet, así que necesitas un túnel (ej. `ngrok http 4000`) y configurar esa URL pública en el panel de Wompi.

## Flujo de una reserva

1. El cliente ve alojamientos/habitaciones (`GET /api/alojamientos`), verifica disponibilidad (`GET /api/disponibilidad`, que usa `fn_valor_estadia`).
2. Al reservar, el backend llama a `pkg_reservas.sp_crear_reserva` (la misma Entrega 2) y dejar la reserva en `PENDIENTE`.
3. El backend arma la URL de Wompi Checkout con la firma de integridad y redirige al cliente ahí.
4. Wompi procesa el pago y:
   - Redirige al cliente de vuelta a `/pago/resultado` (solo informativo).
   - Notifica al backend por el **webhook** (la fuente de verdad) — ahí se inserta la fila en `PAGO` y se confirma la `RESERVA`.

## Estructura

```
TurismoUQ-App/
├── backend/
│   └── src/
│       ├── server.ts
│       ├── config/db.ts          # Pool de conexión Oracle (oracledb thin mode)
│       ├── controllers/          # alojamientos, reservas, pagos
│       ├── services/wompi.service.ts  # Firma de checkout + verificación de webhook
│       ├── routes/index.ts
│       └── middleware/errorHandler.ts # Traduce ORA-2000x a mensajes legibles
└── frontend/
    └── src/
        ├── api/client.ts
        └── pages/ (Home, Alojamiento, ResultadoPago)
```

## Alcance de este MVP

- Cada reserva soporta **una sola habitación** desde la interfaz (el modelo de datos y `sp_crear_reserva` sí soportan varias — ver Entrega 2 —, pero la UI actual simplifica a una por simplicidad de esta primera versión).
- No hay autenticación de usuarios todavía: cualquiera puede reservar con solo sus datos de contacto (igual que reservar por teléfono/WhatsApp en un hotel real).
