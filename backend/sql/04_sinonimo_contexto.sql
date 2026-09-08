-- =====================================================================
-- TurismoUQ-App — 04_sinonimo_contexto.sql
-- Último paso: crea el sinónimo para que turismouq_app pueda llamar
-- pkg_contexto_app sin calificar el esquema. Va en un script aparte
-- porque el paquete no existe todavía cuando corre 02 (como SYSTEM), y
-- turismouq (dueño del paquete) no tiene privilegio para crear objetos
-- dentro del esquema de otro usuario.
-- Ejecutar conectado como SYSTEM, DESPUÉS de 03_contexto_y_rls.sql:
--   sqlplus system/<tu_clave>@//localhost:1521/XEPDB1 @04_sinonimo_contexto.sql
-- =====================================================================

CREATE SYNONYM turismouq_app.pkg_contexto_app FOR turismouq.pkg_contexto_app;
