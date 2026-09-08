-- =====================================================================
-- TurismoUQ-App — 03_contexto_y_rls.sql
-- Row-Level Security (Oracle VPD) sobre RESERVA: cada conexión solo ve
-- las filas que le corresponden, aplicado a nivel de BASE DE DATOS, no
-- solo en el código del backend — así, aunque el backend tuviera un bug
-- de autorización (como los que ya se corrigieron en el código), la
-- base de datos igual no entrega filas ajenas a `turismouq_app`.
--
-- Alcance: solo la tabla RESERVA (la que tiene id_cliente directo).
-- RESERVA_HABITACION y PAGO se protegen por el filtro de aplicación en
-- el código (ya corregido), no por RLS, para no aumentar demasiado el
-- riesgo/alcance de esta capa extra.
--
-- IMPORTANTE: el usuario `turismouq` (dueño del esquema, el que usas
-- para las Entregas 1/2/3) queda EXENTO de esta política gracias al
-- GRANT EXEMPT ACCESS POLICY del script anterior — tus consultas y
-- demos de la base de datos académica no se ven afectadas en nada.
--
-- Ejecutar conectado como: turismouq/<tu_clave>@//localhost:1521/XEPDB1
-- Requiere haber corrido antes 02_usuario_app_minimo.sql (como SYSTEM).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Contexto de aplicación: solo se puede modificar a través del paquete
-- indicado en USING (nadie puede hacer SET_CONTEXT libremente desde
-- fuera de ese paquete, ni siquiera con privilegios de EXECUTE sobre
-- DBMS_SESSION).
-- ---------------------------------------------------------------------
CREATE OR REPLACE CONTEXT ctx_turismouq_app USING turismouq.pkg_contexto_app;

CREATE OR REPLACE PACKAGE pkg_contexto_app AS
  -- Se llama UNA vez al abrir la conexión para cada petición HTTP,
  -- antes de tocar RESERVA, usando el id_cliente que vino del JWT ya
  -- verificado (nunca un valor que el navegador pueda inventar).
  PROCEDURE set_cliente_actual(p_id_cliente NUMBER);

  -- Para las rutas de administrador y para el webhook de Wompi (que no
  -- actúa "como" un cliente específico, sino con la confianza que da
  -- haber verificado la firma de Wompi).
  PROCEDURE set_admin;

  PROCEDURE limpiar;
END pkg_contexto_app;
/

CREATE OR REPLACE PACKAGE BODY pkg_contexto_app AS

  PROCEDURE set_cliente_actual(p_id_cliente NUMBER) IS
  BEGIN
    DBMS_SESSION.SET_CONTEXT('ctx_turismouq_app', 'id_cliente', TO_CHAR(p_id_cliente));
    DBMS_SESSION.SET_CONTEXT('ctx_turismouq_app', 'es_admin', 'N');
  END set_cliente_actual;

  PROCEDURE set_admin IS
  BEGIN
    DBMS_SESSION.SET_CONTEXT('ctx_turismouq_app', 'es_admin', 'S');
    DBMS_SESSION.SET_CONTEXT('ctx_turismouq_app', 'id_cliente', NULL);
  END set_admin;

  PROCEDURE limpiar IS
  BEGIN
    DBMS_SESSION.CLEAR_CONTEXT('ctx_turismouq_app');
  END limpiar;

END pkg_contexto_app;
/

GRANT EXECUTE ON pkg_contexto_app TO turismouq_app;

-- ---------------------------------------------------------------------
-- Función de política: por defecto (sin contexto reconocido) NO deja
-- ver ninguna fila -- "seguro por defecto" -- en vez de dejar ver todo
-- cuando alguien olvida fijar el contexto.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION f_politica_reserva_cliente(
  p_schema VARCHAR2, p_objeto VARCHAR2
) RETURN VARCHAR2
IS
BEGIN
  IF SYS_CONTEXT('ctx_turismouq_app', 'es_admin') = 'S' THEN
    RETURN NULL; -- sin restricción de fila
  ELSIF SYS_CONTEXT('ctx_turismouq_app', 'id_cliente') IS NOT NULL THEN
    RETURN 'id_cliente = SYS_CONTEXT(''ctx_turismouq_app'',''id_cliente'')';
  ELSE
    RETURN '1 = 0'; -- ningún contexto reconocido -> no se ve ninguna fila
  END IF;
END f_politica_reserva_cliente;
/

BEGIN
  DBMS_RLS.ADD_POLICY(
    object_schema   => 'TURISMOUQ',
    object_name     => 'RESERVA',
    policy_name     => 'pol_reserva_por_cliente',
    function_schema => 'TURISMOUQ',
    policy_function => 'F_POLITICA_RESERVA_CLIENTE',
    statement_types => 'SELECT,UPDATE',
    update_check    => TRUE
  );
END;
/

-- Nota: el INSERT en RESERVA lo hace pkg_reservas.sp_crear_reserva, que
-- corre con los privilegios de su DUEÑO (turismouq, exento del RLS), así
-- que crear una reserva nunca se ve afectado por esta política.
