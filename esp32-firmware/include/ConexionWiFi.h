#ifndef CONEXION_WIFI_H
#define CONEXION_WIFI_H

#include <Arduino.h>
#include <WiFi.h>

/**
 * @class ConexionWiFi
 * @brief Gestor de conexión WiFi no bloqueante.
 *
 * Responsable de:
 * - Conexión asíncrona a red WiFi
 * - Reconexión automática
 * - Reporte de estado (desacoplado de Core 0)
 * - Futuro: MQTT, API REST, sincronización de hora
 *
 * NOTA: Se ejecuta en Core 1 (FreeRTOS), separado de tareaGalpon()
 */
class ConexionWiFi
{
public:
  /**
   * @brief Constructor.
   * Las credenciales llegan después con configurar(): vienen de la NVS
   * (portal web) o de config.h, y se conocen recién en setup().
   */
  ConexionWiFi();

  /**
   * @brief Fija la red a la que conectarse (llamar antes de comenzar()).
   */
  void configurar(const String &ssid, const String &password);

  /**
   * @brief Inicia proceso de conexión asíncrona.
   */
  void comenzar();

  /**
   * @brief Actualiza estado de conexión (llamar periódicamente).
   */
  void actualizar();

  /**
   * @brief Indica si está conectado a WiFi.
   * @return true si WiFi está activo
   */
  bool estaConectado() const;

  /**
   * @brief Obtiene dirección IP asignada.
   * @return IPAddress
   */
  IPAddress getIP() const;

  /**
   * @brief Obtiene nombre del host.
   * @return Nombre mDNS (ej: "galponsmart")
   */
  String getHostname() const { return hostname_; }

  /**
   * @brief Establece nombre del host para mDNS.
   * @param hostname Nombre único en la red
   */
  void setHostname(const char *hostname);

  /**
   * @brief Fuerza desconexión y reinicio.
   */
  void desconectar();

  /**
   * @brief true mientras el ESP32 tiene levantada su propia red de rescate.
   */
  bool puntoAccesoActivo() const { return apActivo_; }

  /**
   * @brief Nombre de la red de rescate ("Avisens-XXXX").
   */
  String nombrePuntoAcceso() const;

private:
  String ssid_;
  String password_;
  String hostname_;
  bool conectado_;
  unsigned long ultimoIntento_;
  unsigned long intervaloReconexion_;
  unsigned long desconectadoDesde_;
  bool apActivo_;

  void iniciarPuntoAcceso();
  void detenerPuntoAcceso();

  static constexpr unsigned long INTERVALO_RECONEXION_MS = 30000; // 30 seg
};

#endif // CONEXION_WIFI_H
