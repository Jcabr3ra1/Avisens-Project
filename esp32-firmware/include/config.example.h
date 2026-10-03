#pragma once
// Copia este archivo como config.h y pon tus valores. config.h no se sube a git.

#define WIFI_SSID "TU_WIFI"
#define WIFI_PASS "TU_PASSWORD"

// URL base, sin "/ingest"
#define BACKEND_URL "https://avisens-project-production.up.railway.app"
#define DEVICE_TOKEN "PON_AQUI_EL_TOKEN_DEL_DISPOSITIVO"

// Deben coincidir con el código de los sensores en el backend. "" = no se envía.
#define CODIGO_SENSOR_TEMP "TEMP-G1-01"
#define CODIGO_SENSOR_HUM "HUM-G1-01"
#define CODIGO_SENSOR_NH3 "NH3-G1-01"
#define CODIGO_SENSOR_PESO "PESO-G1-01"
#define CODIGO_SENSOR_AGUA "AGUA-G1-01"
#define CODIGO_SENSOR_PRESENCIA "PRES-G1-01"

// MQTT opcional: host vacío lo desactiva
#define MQTT_BROKER_HOST ""
#define MQTT_BROKER_PORT 1883
#define MQTT_DEVICE_ID "galpon1"
#define MQTT_USUARIO ""
#define MQTT_CLAVE ""
