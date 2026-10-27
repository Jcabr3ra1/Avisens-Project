#pragma once
// config.example.h — Plantilla de configuración de la ESP32-CAM del galpón.
//
// Copia este archivo como `config.h` (misma carpeta) y completa tus valores.
// `config.h` está en .gitignore: el WiFi y el token NO se suben a git.

// ── WiFi ────────────────────────────────────────────────────────────────────
// Solo redes de 2.4 GHz.
#define WIFI_SSID     "TU_WIFI"
#define WIFI_PASSWORD "TU_PASSWORD"

// ── Backend ─────────────────────────────────────────────────────────────────
// URL completa del endpoint de fotos. Producción (Railway) o el backend local
// por la IP LAN del PC (nunca localhost: desde la cámara es ella misma).
//   https://avisens-project-production.up.railway.app/ingest/foto
//   http://192.168.0.101:3000/ingest/foto
#define BACKEND_URL_FOTO "https://avisens-project-production.up.railway.app/ingest/foto"
// Token del controlador registrado en Avisens (Dispositivos → Registrar
// controlador ESP32 en el galpón de la cámara). Se muestra una sola vez.
#define DEVICE_TOKEN "PON_AQUI_EL_TOKEN_DE_LA_CAMARA"

// ── Fotos ───────────────────────────────────────────────────────────────────
// Cada cuánto se envía una foto. 10 s detecta quietud con buen detalle; 30-60 s
// gasta menos red y base de datos.
#define INTERVALO_FOTO_MS 10000
// VGA (640x480): detecta pollos bastante mejor que QVGA (320x240) y una foto
// suelta (no video) no se congela. SVGA (800x600) si la cámara está alta.
#define CAMARA_FRAMESIZE FRAMESIZE_VGA
// Compresión JPEG 10-63 (menor = mejor calidad y foto más pesada).
#define CAMARA_CALIDAD 12
// 1 = voltear, según cómo quede montada.
#define CAMARA_VFLIP   0
#define CAMARA_HMIRROR 0

// ── Robustez ────────────────────────────────────────────────────────────────
// Envíos fallidos seguidos antes de reiniciar la cámara sola (WiFi trabado,
// memoria fragmentada...). 30 fotos a 10 s ≈ 5 minutos sin poder enviar.
#define FALLOS_PARA_REINICIAR 30
#define TIMEOUT_ENVIO_MS 15000
