-- =====================================================================
-- TurismoUQ-App — 02_usuario_app_minimo.sql
-- Crea un usuario de base de datos SOLO para el backend de la app, con
-- privilegios mínimos (nunca el dueño del esquema `turismouq`). Si el
-- backend Node llegara a comprometerse, el atacante hereda como máximo
-- estos privilegios — no control total sobre el esquema académico.
--
-- También prepara el terreno para el Row-Level Security del siguiente
-- script: le da a `turismouq` el privilegio para eximirse de sus propias
-- políticas de RLS, así las Entregas 1/2/3 (que se conectan como
-- `turismouq` directamente) siguen funcionando exactamente igual.
--
-- Ejecutar conectado como SYSTEM:
--   sqlplus system/<tu_clave>@//localhost:1521/XEPDB1 @02_usuario_app_minimo.sql
-- =====================================================================

GRANT CREATE ANY CONTEXT     TO turismouq; -- necesario para 03_contexto_y_rls.sql
GRANT EXEMPT ACCESS POLICY   TO turismouq; -- turismouq queda EXENTO del RLS que se crea después

-- CAMBIA esta clave antes de usarla en serio.
CREATE USER turismouq_app IDENTIFIED BY "&&clave_turismouq_app"
  DEFAULT TABLESPACE users;

GRANT CREATE SESSION TO turismouq_app;

-- Catálogo de solo lectura
GRANT SELECT ON turismouq.municipio        TO turismouq_app;
GRANT SELECT ON turismouq.tipo_alojamiento TO turismouq_app;
GRANT SELECT ON turismouq.servicio         TO turismouq_app;
GRANT SELECT ON turismouq.reserva_habitacion TO turismouq_app; -- solo lectura: el INSERT real lo hace pkg_reservas (definer rights)

-- Catálogo operativo que administra el panel admin
GRANT SELECT, INSERT, UPDATE ON turismouq.alojamiento TO turismouq_app;
GRANT SELECT, INSERT, UPDATE ON turismouq.habitacion  TO turismouq_app;

-- Clientes y sus credenciales de la app
GRANT SELECT, INSERT ON turismouq.cliente                TO turismouq_app;
GRANT SELECT, INSERT ON turismouq.app_credencial_cliente TO turismouq_app;
GRANT SELECT, INSERT, UPDATE ON turismouq.app_usuario_admin TO turismouq_app; -- UPDATE: scripts/crear-admin.ts permite cambiar la clave

-- Reservas y pagos: el INSERT de RESERVA/RESERVA_HABITACION lo hace
-- pkg_reservas (corre con los privilegios de turismouq, su dueño); la app
-- solo necesita leer y actualizar el estado directamente.
GRANT SELECT, UPDATE ON turismouq.reserva TO turismouq_app;
GRANT SELECT, INSERT ON turismouq.pago    TO turismouq_app;

-- Paquete de negocio y tipos usados para llamar a sp_crear_reserva
GRANT EXECUTE ON turismouq.pkg_reservas         TO turismouq_app;
GRANT EXECUTE ON turismouq.ty_item_habitacion   TO turismouq_app;
GRANT EXECUTE ON turismouq.ty_tab_habitaciones  TO turismouq_app;

-- Sinónimos privados: el código del backend usa nombres sin calificar
-- (p. ej. "FROM cliente", no "FROM turismouq.cliente"). Sin esto, esas
-- consultas fallarían con ORA-00942 al correr como turismouq_app.
CREATE SYNONYM turismouq_app.municipio                FOR turismouq.municipio;
CREATE SYNONYM turismouq_app.tipo_alojamiento         FOR turismouq.tipo_alojamiento;
CREATE SYNONYM turismouq_app.servicio                 FOR turismouq.servicio;
CREATE SYNONYM turismouq_app.reserva_habitacion       FOR turismouq.reserva_habitacion;
CREATE SYNONYM turismouq_app.alojamiento              FOR turismouq.alojamiento;
CREATE SYNONYM turismouq_app.habitacion               FOR turismouq.habitacion;
CREATE SYNONYM turismouq_app.cliente                  FOR turismouq.cliente;
CREATE SYNONYM turismouq_app.app_credencial_cliente   FOR turismouq.app_credencial_cliente;
CREATE SYNONYM turismouq_app.app_usuario_admin        FOR turismouq.app_usuario_admin;
CREATE SYNONYM turismouq_app.reserva                  FOR turismouq.reserva;
CREATE SYNONYM turismouq_app.pago                     FOR turismouq.pago;
CREATE SYNONYM turismouq_app.pkg_reservas             FOR turismouq.pkg_reservas;
CREATE SYNONYM turismouq_app.ty_item_habitacion       FOR turismouq.ty_item_habitacion;
CREATE SYNONYM turismouq_app.ty_tab_habitaciones      FOR turismouq.ty_tab_habitaciones;

-- El siguiente script (03_contexto_y_rls.sql) agrega otro sinónimo más
-- (pkg_contexto_app) una vez ese paquete exista.
