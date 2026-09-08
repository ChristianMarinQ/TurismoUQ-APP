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

### 1. Base de datos (una sola vez)

Cuatro scripts, en este orden — el backend **nunca** se conecta como el dueño del esquema (`turismouq`), sino como un usuario nuevo con privilegios mínimos:

```bash
# Tablas de login de la app (no tocan el esquema calificado de la Entrega 1)
sqlplus turismouq/<tu_clave>@//localhost:1521/XEPDB1 @backend/sql/01_tablas_auth.sql

# Usuario turismouq_app con privilegios mínimos + sinónimos (conectado como SYSTEM)
sqlplus system/<tu_clave_system>@//localhost:1521/XEPDB1 @backend/sql/02_usuario_app_minimo.sql

# Row-Level Security sobre RESERVA (conectado como turismouq)
sqlplus turismouq/<tu_clave>@//localhost:1521/XEPDB1 @backend/sql/03_contexto_y_rls.sql

# Último sinónimo, ya que el paquete de contexto existe (conectado como SYSTEM)
sqlplus system/<tu_clave_system>@//localhost:1521/XEPDB1 @backend/sql/04_sinonimo_contexto.sql
```

`turismouq` (el usuario de las Entregas 1-3) queda **exento** de la política de RLS (`GRANT EXEMPT ACCESS POLICY`), así que tus scripts y demos académicos siguen funcionando exactamente igual — el RLS solo aplica a `turismouq_app`.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edita `.env` con:
- La clave que le pusiste a `turismouq_app` en el paso 1 (no la de `turismouq`).
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

## Seguridad

Checklist de lo implementado (y por qué):

| # | Punto | Cómo está resuelto |
|---|---|---|
| 1 | Ocultar API key | Wompi tiene una llave pública (se usa en el checkout, está diseñada para ser pública) y dos secretas (integridad, eventos) que **nunca** salen del backend — el frontend solo recibe la URL final de checkout. |
| 2 | Purgar secrets de Git | `.env` real está en `.gitignore` en ambos proyectos; solo `.env.example` (con placeholders) se versiona. |
| 3 | Usuario de BD de mínimo privilegio | El backend conecta como `turismouq_app` (creado en `sql/02_usuario_app_minimo.sql`), no como el dueño del esquema — sin DDL, sin acceso a tablas que no necesita. |
| 4 | RLS | Row-Level Security de Oracle sobre `RESERVA` (`sql/03_contexto_y_rls.sql`): cada conexión solo ve sus propias filas salvo que el backend fije explícitamente el contexto de cliente/admin — por defecto, sin contexto, **no se ve nada**. |
| 5 | Encriptación | Contraseñas con bcrypt (nunca texto plano); cookie de sesión solo viaja por HTTPS en producción (`secure`); ver también el punto 19. |
| 6 | Forzar autenticación | `GET /api/reservas/:id` y `POST /api/reservas/:id/pago` ahora exigen sesión **y** verifican que la reserva sea del cliente que la pide (antes cualquiera podía leer cualquier reserva con solo adivinar el id). |
| 7 | Restringir acceso a registro | Límite de intentos (`express-rate-limit`) + honeypot invisible en el formulario de registro. |
| 8 | Manipulación de campos | Cada INSERT/UPDATE arma explícitamente sus columnas desde valores validados por Zod — nunca se hace `spread` del body recibido, así que un campo extra o inesperado en la petición se ignora. |
| 9 | Cookies de sesión | `httpOnly` (JS del navegador no la lee), `sameSite=lax`, `secure` en producción, y con prefijo `__Host-` en producción (bloquea que un subdominio o una respuesta no-HTTPS la reemplace). |
| 10 | Hasheo de contraseñas | bcrypt, 12 rondas. Además, el login siempre corre `bcrypt.compare` (contra un hash señuelo si el usuario no existe) para que el tiempo de respuesta no delate qué emails están registrados. |
| 11 | Limitar acceso a login | `express-rate-limit`: máximo 10 intentos cada 15 minutos por IP en `/auth/login`, `/auth/admin/login` y `/auth/registro`. |
| 12 | Anti-bot | Honeypot en el registro (ver punto 7). Un CAPTCHA real (reCAPTCHA/hCaptcha) necesitaría que consigas tus propias llaves, igual que con Wompi — quedó como mejora futura documentada aquí. |
| 13 | Parametrización | Todas las consultas usan bind variables (`:nombre`) de `oracledb` — en ningún lugar se concatena un valor del usuario dentro de un string SQL. |
| 14 | Validar inputs | Esquemas Zod (`src/schemas/`) validan tipo, formato y rango de cada body **antes** de llegar a cualquier controlador o a la base de datos. |
| 15 | Escapar contenido de usuario | React escapa todo por defecto; el proyecto no usa `dangerouslySetInnerHTML` en ningún lado. |
| 16 | Restringir subida de archivos | No aplica todavía — la app no tiene ninguna función de subir archivos. Si se agrega (ej. fotos de alojamientos), validar tipo/tamaño real del archivo y guardarlo fuera de cualquier carpeta servida como código. |
| 17 | Recortar respuestas de la API | Cada consulta selecciona columnas explícitas (nunca `SELECT *`), y los endpoints de login arman a mano `{id, nombre, tipo}` — el hash de la contraseña jamás sale hacia el cliente. |
| 18 | Headers de seguridad | `helmet()` en el backend (X-Content-Type-Options, X-Frame-Options, HSTS, etc.). |
| 19 | HTTPS | La cookie de sesión y el prefijo `__Host-` ya están condicionados a `NODE_ENV=production`. HTTPS en sí se activa donde despliegues (Render/Railway/Vercel lo dan gratis, o un proxy Nginx/Caddy con Let's Encrypt) — no hace falta nada especial en el código, solo tener certificado en producción. |

Además, del análisis inicial se corrigieron: falta de manejo de errores async (`asyncHandler` — un error de Oracle ya no puede tumbar todo el proceso), falta de idempotencia y de validación del monto en el webhook de Wompi, y una lista de propiedades firmadas hardcodeada en vez de confiar en lo que declare el propio payload.

## Estructura

```
TurismoUQ-App/
├── backend/
│   ├── sql/
│   │   ├── 01_tablas_auth.sql        # Tablas de login (app_credencial_cliente, app_usuario_admin)
│   │   ├── 02_usuario_app_minimo.sql # Usuario turismouq_app de privilegio mínimo + sinónimos
│   │   ├── 03_contexto_y_rls.sql     # Contexto de app + Row-Level Security sobre RESERVA
│   │   └── 04_sinonimo_contexto.sql
│   ├── scripts/crear-admin.ts     # Crea/actualiza un usuario del panel admin
│   └── src/
│       ├── server.ts                  # helmet, cors, rate limit general, cookie-parser
│       ├── config/db.ts               # Pool de conexión Oracle (oracledb thin mode)
│       ├── utils/jwt.ts               # Firma/verifica JWT, opciones de la cookie
│       ├── utils/asyncHandler.ts      # Envuelve rutas async para no dejar errores sin capturar
│       ├── utils/contexto.ts          # Fija el contexto de RLS (cliente/admin) antes de tocar RESERVA
│       ├── middleware/auth.ts         # cargarSesion, requireCliente, requireAdmin
│       ├── middleware/validate.ts     # Valida req.body contra un esquema Zod
│       ├── middleware/rateLimit.ts    # Límites de intentos (login/registro y general)
│       ├── middleware/errorHandler.ts # Traduce ORA-2000x a mensajes legibles
│       ├── schemas/                   # Esquemas Zod (auth, reservas, admin)
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
