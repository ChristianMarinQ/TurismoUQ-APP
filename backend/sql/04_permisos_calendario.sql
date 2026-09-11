-- ---------------------------------------------------------------------------
-- Permisos que faltaban para el calendario de precios por temporada.
--
-- Hasta ahora el precio de una estadia siempre se calculaba DENTRO de
-- pkg_reservas, que corre con los privilegios de su dueno (definer rights), asi
-- que turismouq_app nunca necesito leer TEMPORADA ni TARIFA por su cuenta.
-- El endpoint GET /api/alojamientos/:id/calendario si las consulta directamente
-- para pintar cada dia segun su demanda estacional, y sin estos permisos
-- responde ORA-00942 (que el backend devuelve como 500).
--
-- Como ejecutarlo. Sirven las dos vias, porque todo va calificado con
-- "turismouq." y SYSTEM tiene GRANT ANY OBJECT PRIVILEGE y CREATE ANY SYNONYM:
--
--   sqlplus turismouq@localhost:1521/XEPDB1 @04_permisos_calendario.sql
--   sqlplus system@localhost:1521/XEPDB1    @04_permisos_calendario.sql
--
-- Es idempotente: se puede volver a correr sin problema.
-- ---------------------------------------------------------------------------

SET SERVEROUTPUT ON

-- Los GRANT si son idempotentes por si solos: repetirlos no da error.
GRANT SELECT ON turismouq.temporada TO turismouq_app;
GRANT SELECT ON turismouq.tarifa    TO turismouq_app;

-- Los CREATE SYNONYM no lo son (ORA-00955 si ya existe), asi que se capturan.
BEGIN
  EXECUTE IMMEDIATE 'CREATE SYNONYM turismouq_app.temporada FOR turismouq.temporada';
  DBMS_OUTPUT.PUT_LINE('Sinonimo turismouq_app.temporada creado.');
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE = -955 THEN
      DBMS_OUTPUT.PUT_LINE('Sinonimo turismouq_app.temporada ya existia.');
    ELSE
      RAISE;
    END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE SYNONYM turismouq_app.tarifa FOR turismouq.tarifa';
  DBMS_OUTPUT.PUT_LINE('Sinonimo turismouq_app.tarifa creado.');
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE = -955 THEN
      DBMS_OUTPUT.PUT_LINE('Sinonimo turismouq_app.tarifa ya existia.');
    ELSE
      RAISE;
    END IF;
END;
/

-- Verificacion: deben aparecer las dos filas con privilegio SELECT.
--
-- Se consulta DBA_TAB_PRIVS y no ALL_TAB_PRIVS a proposito. ALL_TAB_PRIVS solo
-- muestra las concesiones donde el usuario actual es el dueno del objeto, el
-- concedente o el beneficiario; cuando SYSTEM concede apoyandose en GRANT ANY
-- OBJECT PRIVILEGE, Oracle registra como concedente al dueno (turismouq), asi
-- que SYSTEM no se ve a si mismo en la fila y la consulta salia vacia aunque
-- los permisos estuvieran bien puestos.
--
-- Si corres el script como turismouq (que no es DBA y no ve DBA_TAB_PRIVS),
-- usa en su lugar:  SELECT table_name, privilege, grantee FROM user_tab_privs_made
--                    WHERE table_name IN ('TEMPORADA','TARIFA');
SELECT grantee, table_name, privilege
  FROM dba_tab_privs
 WHERE grantee = 'TURISMOUQ_APP'
   AND owner   = 'TURISMOUQ'
   AND table_name IN ('TEMPORADA', 'TARIFA')
 ORDER BY table_name;
