-- =====================================================================
-- TurismoUQ-App - 02_usuario_app_minimo.sql
-- Crea un usuario de base de datos SOLO para el backend de la app, con
-- privilegios minimos (nunca el dueno del esquema `turismouq`). Si el
-- backend Node llegara a comprometerse, el atacante hereda como maximo
-- estos privilegios - no control total sobre el esquema academico.
--
-- Tambien prepara el terreno para el Row-Level Security del siguiente
-- script: le da a `turismouq` el privilegio para eximirse de sus propias
-- politicas de RLS, asi las Entregas 1/2/3 (que se conectan como
-- `turismouq` directamente) siguen funcionando exactamente igual.
--
-- Ejecutar conectado como SYSTEM:
--   sqlplus system/<tu_clave>@//localhost:1521/XEPDB1 @02_usuario_app_minimo.sql
-- =====================================================================

GRANT CREATE ANY CONTEXT     TO turismouq; -- necesario para 03_contexto_y_rls.sql
GRANT EXEMPT ACCESS POLICY   TO turismouq; -- turismouq queda EXENTO del RLS que se crea despues

-- EXECUTE ON DBMS_RLS no viene otorgado a PUBLIC por defecto, y en Oracle
-- XE ni siquiera SYSTEM puede otorgarlo -- hace falta conectarse como
-- SYS (misma clave que SYSTEM en la instalacion de XE):
--   sqlplus sys/<tu_clave>@//localhost:1521/XEPDB1 AS SYSDBA
--   GRANT EXECUTE ON DBMS_RLS TO turismouq;
-- Si tu SYSTEM si puede, la linea de abajo hace lo mismo:
GRANT EXECUTE ON DBMS_RLS    TO turismouq;

-- La clave no va escrita aqui: sqlplus la pide al ejecutar el script. Usa la misma en DB_PASSWORD de backend/.env.
CREATE USER turismouq_app IDENTIFIED BY "&&clave_turismouq_app"
  DEFAULT TABLESPACE users;

GRANT CREATE SESSION TO turismouq_app;

-- Catalogo de solo lectura
GRANT SELECT ON turismouq.municipio        TO turismouq_app;
GRANT SELECT ON turismouq.tipo_alojamiento TO turismouq_app;
GRANT SELECT ON turismouq.servicio         TO turismouq_app;
GRANT SELECT ON turismouq.reserva_habitacion TO turismouq_app; -- solo lectura: el INSERT real lo hace pkg_reservas (definer rights)

-- Temporadas y tarifas: hasta ahora el precio siempre se calculaba dentro de
-- pkg_reservas (definer rights), asi que la app nunca las leia directamente.
-- El calendario de precios si las consulta, para pintar cada dia segun su
-- demanda estacional. Solo lectura: las tarifas las mantiene turismouq.
GRANT SELECT ON turismouq.temporada TO turismouq_app;
GRANT SELECT ON turismouq.tarifa    TO turismouq_app;

-- Catalogo operativo que administra el panel admin
GRANT SELECT, INSERT, UPDATE ON turismouq.alojamiento TO turismouq_app;
GRANT SELECT, INSERT, UPDATE ON turismouq.habitacion  TO turismouq_app;

-- Clientes y sus credenciales de la app
GRANT SELECT, INSERT ON turismouq.cliente                TO turismouq_app;
GRANT SELECT, INSERT ON turismouq.app_credencial_cliente TO turismouq_app;
GRANT SELECT, INSERT, UPDATE ON turismouq.app_usuario_admin TO turismouq_app; -- UPDATE: scripts/crear-admin.ts permite cambiar la clave

-- Reservas y pagos: el INSERT de RESERVA/RESERVA_HABITACION lo hace
-- pkg_reservas (corre con los privilegios de turismouq, su dueno); la app
-- solo necesita leer y actualizar el estado directamente.
GRANT SELECT, UPDATE ON turismouq.reserva TO turismouq_app;
GRANT SELECT, INSERT ON turismouq.pago    TO turismouq_app;

-- Paquete de negocio y tipos usados para llamar a sp_crear_reserva
GRANT EXECUTE ON turismouq.pkg_reservas         TO turismouq_app;
GRANT EXECUTE ON turismouq.ty_item_habitacion   TO turismouq_app;
GRANT EXECUTE ON turismouq.ty_tab_habitaciones  TO turismouq_app;

-- Sinonimos privados: el codigo del backend usa nombres sin calificar
-- (p. ej. "FROM cliente", no "FROM turismouq.cliente"). Sin esto, esas
-- consultas fallarian con ORA-00942 al correr como turismouq_app.
CREATE SYNONYM turismouq_app.municipio                FOR turismouq.municipio;
CREATE SYNONYM turismouq_app.tipo_alojamiento         FOR turismouq.tipo_alojamiento;
CREATE SYNONYM turismouq_app.servicio                 FOR turismouq.servicio;
CREATE SYNONYM turismouq_app.reserva_habitacion       FOR turismouq.reserva_habitacion;
CREATE SYNONYM turismouq_app.temporada                FOR turismouq.temporada;
CREATE SYNONYM turismouq_app.tarifa                   FOR turismouq.tarifa;
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

-- El siguiente script (03_contexto_y_rls.sql) agrega otro sinonimo mas
-- (pkg_contexto_app) una vez ese paquete exista.
