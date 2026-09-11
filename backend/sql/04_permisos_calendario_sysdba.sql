-- ---------------------------------------------------------------------------
-- Envoltorio para aplicar 04_permisos_calendario.sql sin escribir contrasenas.
--
-- En Windows, si tu usuario pertenece al grupo ORA_DBA, Oracle te autentica
-- contra el sistema operativo: "/ as sysdba" entra sin pedir clave. Es la
-- misma via que se uso para conceder EXECUTE sobre DBMS_RLS.
--
-- Como ejecutarlo (un solo comando, sin contrasena):
--   sqlplus / as sysdba @C:\ProyectosIng\TurismoUQ-App\backend\sql\04_permisos_calendario_sysdba.sql
--
-- "/ as sysdba" entra al contenedor raiz (CDB$ROOT), donde las tablas del
-- proyecto no existen: viven en la PDB. Por eso lo primero es cambiar de
-- contenedor; sin esta linea el script fallaria con ORA-00942.
-- ---------------------------------------------------------------------------

ALTER SESSION SET CONTAINER = XEPDB1;

SHOW CON_NAME

-- "@@" resuelve la ruta relativa al directorio de ESTE script, asi que
-- funciona sin importar desde que carpeta lo invoques.
@@04_permisos_calendario.sql
