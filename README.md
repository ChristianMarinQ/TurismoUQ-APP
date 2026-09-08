# TurismoUQ-App

Aplicación funcional (con interfaz) que consume la misma base de datos Oracle del proyecto académico [`TurismoUQ`](../TurismoUQ) — reservas con pago real vía **Wompi (sandbox)**, cuentas de cliente y un panel de administración. Este proyecto es aparte del entregable de Bases de Datos II (que no lleva interfaz); aquí sí hay frontend y backend.

- **Backend**: Node.js + TypeScript + Express, conectado a Oracle con `oracledb` (modo *thin*, sin necesitar Oracle Instant Client). Llama directamente a `pkg_reservas` (el paquete PL/SQL de la Entrega 2) para crear reservas.
- **Frontend**: React + TypeScript + Vite + Tailwind CSS.
- **Autenticación**: JWT en cookie httpOnly + secure + sameSite, contraseñas con bcrypt. Dos tipos de sesión: cliente (reserva, ve su historial) y admin (panel de administración).
- **Pagos**: Wompi Web Checkout (redirect) en modo sandbox — sin dinero real.

## Requisitos

- Node.js 18+ (ya tienes v20.11 instalado).
- La base de datos `TurismoUQ` corriendo y con las Entregas 1 y 2 ya aplicadas (necesita `pkg_reservas`, los tipos `ty_item_habitacion`/`ty_tab_habitaciones`, y las tablas con datos).
- Una cuenta de comercio de pruebas (sandbox) en Wompi — ver más abajo.

## Configurar y correr

### 1. Tablas de autenticación (una sola vez)

Estas tablas son solo de la app (no tocan el esquema calificado de la Entrega 1):

```bash
sqlplus turismouq/<tu_clave>@//localhost:1521/XEPDB1 @backend/sql/01_tablas_auth.sql
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edita `.env` con:
- La clave real de tu usuario `turismouq`.
- Un `JWT_SECRET` aleatorio (el `.env.example` te da el comando para generarlo).
- Tus llaves de sandbox de Wompi (ver sección siguiente).

```bash
npm run dev
```

Debe quedar escuchando en `http://localhost:4000`. Prueba con `http://localhost:4000/api/salud`.

Crea tu primer usuario administrador (para entrar al panel):

```bash
npx ts-node scripts/crear-admin.ts admin "unaClaveSegura123" "Nombre del Administrador"
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5174`.

## Conseguir llaves de Wompi (sandbox)

1. Crea una cuenta en https://comercios.wompi.co/ (o en el portal de sandbox de Wompi para desarrolladores).
2. En el panel, busca la sección de **Desarrolladores / API Keys** en modo **Sandbox/Pruebas**.
3. Copia la **llave pública** (`pub_test_...`), el **secreto de integridad** y el **secreto de eventos** — van en `backend/.env` como `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET` y `WOMPI_EVENTS_SECRET`.
4. Wompi tiene tarjetas de prueba documentadas (aprobada / rechazada) para probar el checkout sin dinero real.
5. Para que el **webhook** (`/api/pagos/wompi/webhook`) funcione en desarrollo local, Wompi necesita poder alcanzar tu servidor — localhost no es visible desde internet, así que necesitas un túnel (ej. `ngrok http 4000`) y configurar esa URL pública en el panel de Wompi.

## Cuentas y roles

- **Cliente**: se registra en `/registro`, inicia sesión en `/login`. Puede reservar (`/alojamientos/:id`) y ver su historial en `/mis-reservas`.
- **Administrador**: inicia sesión en `/admin/login` (cuenta creada con `scripts/crear-admin.ts`, no hay registro público). Accede al panel en `/admin`: resumen de estadísticas, todas las reservas, y gestión de alojamientos/habitaciones.

La sesión se guarda en una cookie `turismouq_token`: `httpOnly` (JavaScript del navegador no puede leerla, mitiga robo por XSS), `sameSite=lax` (mitiga CSRF) y `secure` en producción (solo viaja por HTTPS).

## Flujo de una reserva

1. El cliente (con sesión iniciada) ve alojamientos/habitaciones (`GET /api/alojamientos`), verifica disponibilidad (`GET /api/disponibilidad`, que usa `fn_valor_estadia`).
2. Al reservar, el backend llama a `pkg_reservas.sp_crear_reserva` (la misma Entrega 2) usando el `id_cliente` de la sesión (nunca uno que mande el navegador) y deja la reserva en `PENDIENTE`.
3. El backend arma la URL de Wompi Checkout con la firma de integridad y redirige al cliente ahí.
4. Wompi procesa el pago y:
   - Redirige al cliente de vuelta a `/pago/resultado` (solo informativo).
   - Notifica al backend por el **webhook** (la fuente de verdad) — ahí se inserta la fila en `PAGO` y se confirma la `RESERVA`.

## Estructura

```
TurismoUQ-App/
├── backend/
│   ├── sql/01_tablas_auth.sql     # Tablas de login (app_credencial_cliente, app_usuario_admin)
│   ├── scripts/crear-admin.ts     # Crea/actualiza un usuario del panel admin
│   └── src/
│       ├── server.ts
│       ├── config/db.ts               # Pool de conexión Oracle (oracledb thin mode)
│       ├── utils/jwt.ts               # Firma/verifica JWT, opciones de la cookie
│       ├── middleware/auth.ts         # cargarSesion, requireCliente, requireAdmin
│       ├── middleware/errorHandler.ts # Traduce ORA-2000x a mensajes legibles
│       ├── controllers/               # auth, alojamientos, reservas, pagos, admin
│       ├── services/wompi.service.ts  # Firma de checkout + verificación de webhook
│       └── routes/index.ts
└── frontend/
    └── src/
        ├── context/AuthContext.tsx
        ├── components/ (Navbar, RutaProtegida, AdminLayout)
        ├── api/client.ts
        └── pages/ (Home, Alojamiento, Login, Registro, MisReservas, ResultadoPago, admin/*)
```

## Alcance de este MVP

- Cada reserva soporta **una sola habitación** desde la interfaz (el modelo de datos y `sp_crear_reserva` sí soportan varias — ver Entrega 2 —, pero la UI actual simplifica a una por simplicidad de esta primera versión).
- Un solo rol "admin" en el panel (no los 4 roles de la Entrega 3 — recepción/admin de alojamiento/gerente/auditor — que son sobre la base de datos directamente, no sobre esta app web).
