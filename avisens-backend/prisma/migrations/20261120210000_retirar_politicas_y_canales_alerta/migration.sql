-- Retira politicas_alerta y alertas_canales (canales externos SMS/WhatsApp/Email).
-- Las alertas se notifican únicamente por el módulo de notificaciones dentro de la app.
DROP TABLE IF EXISTS "alertas_canales";
DROP TABLE IF EXISTS "politicas_alerta";
