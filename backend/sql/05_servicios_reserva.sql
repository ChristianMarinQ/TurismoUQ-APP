-- ---------------------------------------------------------------------------
-- Servicios adicionales dentro de una reserva.
--
-- La tabla RESERVA_SERVICIO existe desde la Entrega 1 (y la carga de datos le
-- metio ~43.000 filas), pero la aplicacion nunca la habia usado: los servicios
-- de un alojamiento se mostraban en la ficha y no se podian contratar.
--
-- pkg_reservas es entregable calificado y NO se toca. Todo lo de servicios vive
-- aqui, en un paquete aparte y "de aplicacion" (pkg_servicios_app), igual que
-- pkg_contexto_app en 03_contexto_y_rls.sql: son piezas que existen para el
-- backend, no para la base academica.
--
-- Que crea, todo en el esquema TURISMOUQ:
--   * TYPE   ty_item_servicio / ty_tab_servicios  -> para pasar la lista de
--            servicios desde Node en UNA sola llamada (mismo patron que
--            ty_item_habitacion / ty_tab_habitaciones de 04_plsql/01_tipos.sql).
--   * PKG    pkg_servicios_app.sp_agregar_servicios
--   * GRANTs y SINONIMOS privados para turismouq_app.
--
-- Como ejecutarlo. Sirven las dos vias, porque todo va calificado con
-- "turismouq." y SYSTEM/SYS tienen CREATE ANY TYPE, CREATE ANY PROCEDURE,
-- GRANT ANY OBJECT PRIVILEGE y CREATE ANY SYNONYM:
--
--   1) Como el dueno del esquema:
--      sqlplus turismouq@localhost:1521/XEPDB1 @05_servicios_reserva.sql
--
--   2) Con autenticacion del sistema operativo (grupo ORA_DBA en Windows).
--      "/ as sysdba" entra al contenedor raiz, donde las tablas del proyecto
--      no existen, asi que hay que cambiar de contenedor primero:
--      sqlplus / as sysdba
--        ALTER SESSION SET CONTAINER = XEPDB1;
--        @C:\ProyectosIng\TurismoUQ-App\backend\sql\05_servicios_reserva.sql
--
-- Es idempotente: se puede volver a correr sin problema.
-- ---------------------------------------------------------------------------

SET SERVEROUTPUT ON

-- ---------------------------------------------------------------------------
-- 1. Tipos de coleccion
--
-- Se usa CREATE TYPE (no CREATE OR REPLACE TYPE) dentro de un bloque que
-- captura ORA-00955, igual que los sinonimos de 04_permisos_calendario.sql.
-- El motivo es que un CREATE OR REPLACE sobre ty_item_servicio fallaria con
-- ORA-02303 en la segunda corrida, porque para entonces ty_tab_servicios ya
-- depende de el. Con este patron, volver a correr el script no rompe nada.
-- (Si alguna vez hay que CAMBIAR la definicion de los tipos, hay que borrarlos
--  a mano en orden inverso: DROP TYPE ty_tab_servicios; DROP TYPE ty_item_servicio;)
-- ---------------------------------------------------------------------------
BEGIN
  EXECUTE IMMEDIATE 'CREATE TYPE turismouq.ty_item_servicio AS OBJECT (
                       id_servicio NUMBER,
                       cantidad    NUMBER
                     )';
  DBMS_OUTPUT.PUT_LINE('Tipo turismouq.ty_item_servicio creado.');
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE = -955 THEN
      DBMS_OUTPUT.PUT_LINE('Tipo turismouq.ty_item_servicio ya existia.');
    ELSE
      RAISE;
    END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE TYPE turismouq.ty_tab_servicios AS TABLE OF turismouq.ty_item_servicio';
  DBMS_OUTPUT.PUT_LINE('Tipo turismouq.ty_tab_servicios creado.');
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE = -955 THEN
      DBMS_OUTPUT.PUT_LINE('Tipo turismouq.ty_tab_servicios ya existia.');
    ELSE
      RAISE;
    END IF;
END;
/

-- ---------------------------------------------------------------------------
-- 2. Paquete de negocio
-- ---------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE turismouq.pkg_servicios_app AS

  -- Anade servicios adicionales a una reserva ya creada y actualiza su
  -- valor_total. Pensado para llamarse DENTRO de la misma transaccion que
  -- pkg_reservas.sp_crear_reserva: si algo falla aqui, el ROLLBACK de quien
  -- llama deshace tambien la reserva y no queda una reserva "a medias".
  --
  -- Lanza excepciones propias via RAISE_APPLICATION_ERROR:
  --   -20011  la reserva no existe o no es del cliente indicado
  --   -20012  la reserva no esta en estado PENDIENTE
  --   -20013  el servicio no pertenece al alojamiento de la reserva
  --   -20014  cantidad fuera de rango (debe ser 1..c_max_cantidad)
  --
  -- NO hace COMMIT ni ROLLBACK a proposito: la transaccion la controla quien
  -- llama (el controlador de Node), igual que con sp_crear_reserva.
  PROCEDURE sp_agregar_servicios(
    p_id_reserva IN NUMBER,
    p_id_cliente IN NUMBER,
    p_servicios  IN ty_tab_servicios
  );

END pkg_servicios_app;
/

CREATE OR REPLACE PACKAGE BODY turismouq.pkg_servicios_app AS

  -- Tope de unidades por servicio dentro de una misma reserva. No es una regla
  -- del enunciado: es un freno para que un cliente no pida "999999 desayunos"
  -- y dispare el valor_total (o el trabajo del INSERT) sin querer.
  c_max_cantidad CONSTANT NUMBER := 50;

  PROCEDURE sp_agregar_servicios(
    p_id_reserva IN NUMBER,
    p_id_cliente IN NUMBER,
    p_servicios  IN ty_tab_servicios
  )
  IS
    -- Acumulador para agrupar el mismo id_servicio que llegue repetido: en vez
    -- de insertar dos filas para "Desayuno x1" y "Desayuno x2", se inserta una
    -- sola con cantidad 3. Asi la reserva no muestra lineas duplicadas y el
    -- tope de cantidad se aplica sobre el total pedido, no sobre cada trozo.
    TYPE t_cantidades IS TABLE OF NUMBER INDEX BY PLS_INTEGER;
    v_cantidades  t_cantidades;

    v_id_servicio PLS_INTEGER;
    v_id_cliente  reserva.id_cliente%TYPE;
    v_estado      reserva.estado%TYPE;
    v_precio      servicio.precio%TYPE;
    v_total       NUMBER := 0;
  BEGIN
    -- Sin servicios no hay nada que hacer: el campo es opcional en la API.
    IF p_servicios IS NULL OR p_servicios.COUNT = 0 THEN
      RETURN;
    END IF;

    -- ----------------------------------------------------------------------
    -- Validacion 1: la reserva existe, es de ESTE cliente y esta PENDIENTE.
    --
    -- El paquete corre con derechos del DEFINIDOR (turismouq, exento del RLS),
    -- asi que ve todas las reservas: la comprobacion de propiedad tiene que
    -- hacerse aqui de forma explicita. Sin ella, un cliente podria anadirle
    -- servicios (y coste) a la reserva de otro con solo cambiar un id.
    -- ----------------------------------------------------------------------
    BEGIN
      SELECT id_cliente, estado
        INTO v_id_cliente, v_estado
        FROM reserva
       WHERE id_reserva = p_id_reserva;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20011, 'La reserva ' || p_id_reserva || ' no existe o no pertenece al cliente.');
    END;

    -- Mismo error que "no existe": no se distingue una cosa de la otra para no
    -- confirmarle a nadie que ids de reserva estan ocupados.
    IF v_id_cliente <> p_id_cliente THEN
      RAISE_APPLICATION_ERROR(-20011, 'La reserva ' || p_id_reserva || ' no existe o no pertenece al cliente.');
    END IF;

    IF v_estado <> 'PENDIENTE' THEN
      RAISE_APPLICATION_ERROR(-20012,
        'Solo se pueden agregar servicios a una reserva PENDIENTE (la reserva ' ||
        p_id_reserva || ' esta en estado ' || v_estado || ').');
    END IF;

    -- ----------------------------------------------------------------------
    -- Validacion 2: cantidades, agrupando los ids repetidos.
    -- ----------------------------------------------------------------------
    FOR i IN 1 .. p_servicios.COUNT LOOP
      IF p_servicios(i).id_servicio IS NULL OR p_servicios(i).cantidad IS NULL THEN
        RAISE_APPLICATION_ERROR(-20014, 'Cada servicio debe traer id_servicio y cantidad.');
      END IF;

      -- Se valida ANTES de acumular: si no, una cantidad negativa podria
      -- "compensarse" con otra positiva del mismo servicio y colarse.
      IF p_servicios(i).cantidad <= 0 THEN
        RAISE_APPLICATION_ERROR(-20014,
          'La cantidad del servicio ' || p_servicios(i).id_servicio || ' debe ser mayor que cero.');
      END IF;

      v_id_servicio := p_servicios(i).id_servicio;

      -- Hay que preguntar con EXISTS antes de leer. En un arreglo asociativo,
      -- referenciar una clave que todavia no esta lanza NO_DATA_FOUND, y un
      -- NVL() alrededor NO protege: la excepcion salta al resolver el elemento,
      -- antes de que NVL llegue a evaluarse.
      IF v_cantidades.EXISTS(v_id_servicio) THEN
        v_cantidades(v_id_servicio) := v_cantidades(v_id_servicio) + p_servicios(i).cantidad;
      ELSE
        v_cantidades(v_id_servicio) := p_servicios(i).cantidad;
      END IF;

      IF v_cantidades(v_id_servicio) > c_max_cantidad THEN
        RAISE_APPLICATION_ERROR(-20014,
          'La cantidad del servicio ' || v_id_servicio || ' no puede superar ' || c_max_cantidad || '.');
      END IF;
    END LOOP;

    -- ----------------------------------------------------------------------
    -- Validacion 3 e insercion.
    -- ----------------------------------------------------------------------
    v_id_servicio := v_cantidades.FIRST;
    WHILE v_id_servicio IS NOT NULL LOOP

      -- El servicio tiene que pertenecer al alojamiento de alguna de las
      -- habitaciones de ESTA reserva. Es la validacion clave del procedimiento:
      -- sin ella un cliente podria anadir a su reserva el "Spa" barato de otro
      -- alojamiento (pagando de menos por algo que consume aqui), o simplemente
      -- colar el id de un servicio que no tiene nada que ver con su estadia.
      -- El precio sale de la misma consulta, asi que pertenencia y precio se
      -- resuelven de una sola pasada.
      BEGIN
        SELECT s.precio
          INTO v_precio
          FROM servicio s
         WHERE s.id_servicio = v_id_servicio
           AND EXISTS (
                 SELECT 1
                   FROM reserva_habitacion rh
                   JOIN habitacion h ON h.id_habitacion = rh.id_habitacion
                  WHERE rh.id_reserva   = p_id_reserva
                    AND h.id_alojamiento = s.id_alojamiento
               );
      EXCEPTION
        WHEN NO_DATA_FOUND THEN
          RAISE_APPLICATION_ERROR(-20013,
            'El servicio ' || v_id_servicio || ' no pertenece al alojamiento de la reserva ' || p_id_reserva || '.');
      END;

      -- precio_unitario se guarda como una FOTO del precio en este momento, no
      -- como una referencia a servicio.precio. Es exactamente el mismo motivo
      -- por el que reserva_habitacion guarda valor_estadia: si manana el
      -- alojamiento sube la tarifa del servicio, lo ya reservado (y ya cobrado
      -- al cliente) no debe cambiar de precio de forma retroactiva, y el
      -- valor_total de la reserva tiene que seguir cuadrando con sus lineas.
      INSERT INTO reserva_servicio (id_reserva, id_servicio, cantidad, precio_unitario)
      VALUES (p_id_reserva, v_id_servicio, v_cantidades(v_id_servicio), v_precio);

      v_total := v_total + v_cantidades(v_id_servicio) * v_precio;

      v_id_servicio := v_cantidades.NEXT(v_id_servicio);
    END LOOP;

    -- Se SUMA sobre lo que ya hay (el alojamiento que calculo sp_crear_reserva),
    -- no se recalcula: asi llamar a este procedimiento no pisa el valor de las
    -- habitaciones.
    UPDATE reserva
       SET valor_total = valor_total + v_total
     WHERE id_reserva = p_id_reserva;

  END sp_agregar_servicios;

END pkg_servicios_app;
/

-- ---------------------------------------------------------------------------
-- 3. Permisos para el usuario de la aplicacion
--
-- Los GRANT son idempotentes por si solos: repetirlos no da error.
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON turismouq.pkg_servicios_app TO turismouq_app;
GRANT EXECUTE ON turismouq.ty_item_servicio  TO turismouq_app;
GRANT EXECUTE ON turismouq.ty_tab_servicios  TO turismouq_app;

-- Solo lectura: el INSERT real lo hace pkg_servicios_app con derechos del
-- definidor. turismouq_app necesita el SELECT para mostrar los servicios
-- contratados en GET /api/reservas/:id.
GRANT SELECT ON turismouq.reserva_servicio TO turismouq_app;

-- ---------------------------------------------------------------------------
-- 4. Sinonimos privados
--
-- El backend usa nombres sin calificar ("FROM reserva_servicio", no
-- "FROM turismouq.reserva_servicio"), y oracledb resuelve TY_TAB_SERVICIOS por
-- nombre simple con getDbObjectClass. Sin estos sinonimos fallaria con
-- ORA-00942 / ORA-04043.
--
-- Los CREATE SYNONYM no son idempotentes (ORA-00955 si ya existe), asi que se
-- capturan uno a uno, igual que en 04_permisos_calendario.sql.
-- ---------------------------------------------------------------------------
BEGIN
  EXECUTE IMMEDIATE 'CREATE SYNONYM turismouq_app.pkg_servicios_app FOR turismouq.pkg_servicios_app';
  DBMS_OUTPUT.PUT_LINE('Sinonimo turismouq_app.pkg_servicios_app creado.');
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE = -955 THEN
      DBMS_OUTPUT.PUT_LINE('Sinonimo turismouq_app.pkg_servicios_app ya existia.');
    ELSE
      RAISE;
    END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE SYNONYM turismouq_app.ty_item_servicio FOR turismouq.ty_item_servicio';
  DBMS_OUTPUT.PUT_LINE('Sinonimo turismouq_app.ty_item_servicio creado.');
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE = -955 THEN
      DBMS_OUTPUT.PUT_LINE('Sinonimo turismouq_app.ty_item_servicio ya existia.');
    ELSE
      RAISE;
    END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE SYNONYM turismouq_app.ty_tab_servicios FOR turismouq.ty_tab_servicios';
  DBMS_OUTPUT.PUT_LINE('Sinonimo turismouq_app.ty_tab_servicios creado.');
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE = -955 THEN
      DBMS_OUTPUT.PUT_LINE('Sinonimo turismouq_app.ty_tab_servicios ya existia.');
    ELSE
      RAISE;
    END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE SYNONYM turismouq_app.reserva_servicio FOR turismouq.reserva_servicio';
  DBMS_OUTPUT.PUT_LINE('Sinonimo turismouq_app.reserva_servicio creado.');
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE = -955 THEN
      DBMS_OUTPUT.PUT_LINE('Sinonimo turismouq_app.reserva_servicio ya existia.');
    ELSE
      RAISE;
    END IF;
END;
/

-- ---------------------------------------------------------------------------
-- 5. Verificacion
--
-- Se consultan las vistas DBA_* y no las ALL_*. ALL_TAB_PRIVS solo muestra las
-- concesiones donde el usuario actual es el dueno del objeto, el concedente o
-- el beneficiario; cuando SYSTEM/SYS concede apoyandose en GRANT ANY OBJECT
-- PRIVILEGE, Oracle registra como concedente al dueno (turismouq), asi que
-- quien corre el script no se ve a si mismo en la fila y la consulta salia
-- vacia aunque los permisos estuvieran bien puestos.
--
-- Si corres el script como turismouq (que no es DBA y no ve las DBA_*), usa:
--   SELECT table_name, privilege, grantee FROM user_tab_privs_made
--    WHERE table_name IN ('PKG_SERVICIOS_APP','TY_ITEM_SERVICIO','TY_TAB_SERVICIOS','RESERVA_SERVICIO');
--   SELECT object_name, object_type, status FROM user_objects
--    WHERE object_name IN ('PKG_SERVICIOS_APP','TY_ITEM_SERVICIO','TY_TAB_SERVICIOS');
-- ---------------------------------------------------------------------------

-- Deben salir 4 filas: EXECUTE sobre el paquete y los dos tipos, SELECT sobre
-- la tabla.
SELECT grantee, table_name, privilege
  FROM dba_tab_privs
 WHERE grantee = 'TURISMOUQ_APP'
   AND owner   = 'TURISMOUQ'
   AND table_name IN ('PKG_SERVICIOS_APP', 'TY_ITEM_SERVICIO', 'TY_TAB_SERVICIOS', 'RESERVA_SERVICIO')
 ORDER BY table_name, privilege;

-- Los objetos creados deben salir todos con STATUS = 'VALID' (un PACKAGE BODY
-- en INVALID significa que el cuerpo no compilo: revisa SHOW ERRORS).
SELECT owner, object_name, object_type, status
  FROM dba_objects
 WHERE (owner = 'TURISMOUQ'
        AND object_name IN ('PKG_SERVICIOS_APP', 'TY_ITEM_SERVICIO', 'TY_TAB_SERVICIOS'))
    OR (owner = 'TURISMOUQ_APP'
        AND object_name IN ('PKG_SERVICIOS_APP', 'TY_ITEM_SERVICIO', 'TY_TAB_SERVICIOS', 'RESERVA_SERVICIO'))
 ORDER BY owner, object_type, object_name;
