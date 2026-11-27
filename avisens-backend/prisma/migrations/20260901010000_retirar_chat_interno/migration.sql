-- Retira el chat interno del equipo.
--
-- Las carpetas de 20260831060000_mensajes_equipo y 20260831090000_chat_privado_equipo
-- se dejan donde estan a proposito: quien ya las aplico tiene esa fila en
-- _prisma_migrations, y borrar la carpeta le dejaria el historial inconsistente.
-- El historial registra lo que paso; lo que se deshace se deshace hacia adelante.
--
-- El IF EXISTS es necesario porque la del chat privado nunca se llego a
-- commitear: hay bases que la tienen aplicada y bases que no.
DROP TABLE IF EXISTS "mensajes_privados_equipo";
DROP TABLE IF EXISTS "conversaciones_privadas_equipo";
DROP TABLE IF EXISTS "mensajes_equipo";
