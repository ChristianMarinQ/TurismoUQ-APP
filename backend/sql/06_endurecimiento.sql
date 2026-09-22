-- ---------------------------------------------------------------------------
-- TurismoUQ-App - 06_endurecimiento.sql
-- Ajustes de seguridad salidos de la auditoria del proyecto.
--
-- Ejecutar conectado como el dueno del esquema:
--   sqlplus turismouq@//localhost:1521/XEPDB1 @06_endurecimiento.sql
--
-- Es idempotente: se puede volver a correr sin romper nada.
-- ---------------------------------------------------------------------------

SET SERVEROUTPUT ON

-- ---------------------------------------------------------------------------
-- 1. Un pago por transaccion de la pasarela.
--
-- El webhook de Wompi comprueba con un SELECT si el transaction.id ya se
-- proceso, pero dos reintentos que lleguen a la vez pasan los dos esa
-- comprobacion e insertan dos pagos para la misma transaccion. El indice
-- unico lo impide en la base, que es donde no hay carrera posible.
--
-- Los pagos de la carga academica no tienen referencia (NULL) y un indice
-- unico de Oracle admite tantos NULL como quiera: no estorban.
-- ---------------------------------------------------------------------------
BEGIN
  EXECUTE IMMEDIATE
    'CREATE UNIQUE INDEX ux_pago_referencia_pasarela ON pago (referencia_pasarela)';
  DBMS_OUTPUT.PUT_LINE('Indice ux_pago_referencia_pasarela creado.');
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE = -955 THEN -- ORA-00955: el nombre ya existe
      DBMS_OUTPUT.PUT_LINE('Indice ux_pago_referencia_pasarela ya existia.');
    ELSIF SQLCODE = -1452 THEN -- ORA-01452: ya hay referencias duplicadas
      DBMS_OUTPUT.PUT_LINE('ATENCION: hay pagos duplicados con la misma referencia. ' ||
                           'Revisalos con la consulta de verificacion de abajo y borra los sobrantes.');
    ELSE
      RAISE;
    END IF;
END;
/

-- ---------------------------------------------------------------------------
-- 2. Verificacion
-- ---------------------------------------------------------------------------

-- Debe salir el indice en estado VALID.
SELECT index_name, uniqueness, status
  FROM user_indexes
 WHERE index_name = 'UX_PAGO_REFERENCIA_PASARELA';

-- Si el paso 1 aviso de duplicados, aqui salen cuales son (deberia ir vacia).
SELECT referencia_pasarela, COUNT(*) AS veces
  FROM pago
 WHERE referencia_pasarela IS NOT NULL
 GROUP BY referencia_pasarela
HAVING COUNT(*) > 1
 ORDER BY veces DESC;
