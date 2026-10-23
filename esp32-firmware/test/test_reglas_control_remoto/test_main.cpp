// Pruebas de las reglas de órdenes remotas (B4: lecturas válidas, inválidas,
// sostenidas, recuperación y fallos persistentes). Se ejecutan en el
// computador con `pio test -e native`; no usan la placa ni Arduino.
#include <unity.h>
#include <string.h>

// Mismos umbrales que config.example.h.
#define TEMP_CALOR 32.0
#define NH3_ALTO 1500
#define NIVEL_BOMBA_ON 5.0
#define NIVEL_BOMBA_OFF 3.0
#include "ReglasControlRemoto.h"

namespace {

// Galpón en condiciones normales: todo leído en este ciclo, sin calor ni
// gases, tanque a media altura (entre OFF y ON).
ContextoProtecciones normal()
{
  ContextoProtecciones c = {};
  c.sistemaEnMonitoreo = true;
  c.dhtEnError = false;
  c.dhtValida = true;
  c.temperatura = 26.0f;
  c.rawNH3 = 500;
  c.ultrasonicoEnError = false;
  c.aguaValida = true;
  c.aguaActual = true;
  c.distanciaAgua = 4.0f;
  return c;
}

bool contiene(const char *motivo, const char *texto)
{
  return motivo != nullptr && strstr(motivo, texto) != nullptr;
}

const UsoRegla AUT = UsoRegla::AUTORIZAR;
const UsoRegla SOS = UsoRegla::SOSTENER;

}  // namespace

void setUp() {}
void tearDown() {}

// ─── Lecturas válidas ────────────────────────────────────────────────────

void test_con_lecturas_validas_se_autoriza_lo_seguro()
{
  ContextoProtecciones c = normal();
  TEST_ASSERT_NULL(motivoBloqueoRemoto(1, true, AUT, c));   // calefacción
  TEST_ASSERT_NULL(motivoBloqueoRemoto(2, false, AUT, c));  // apagar ventilador
  TEST_ASSERT_NULL(motivoBloqueoRemoto(4, true, AUT, c));   // bomba, tanque a media altura
}

void test_las_restricciones_de_la_logica_automatica_se_mantienen()
{
  ContextoProtecciones c = normal();
  c.temperatura = 33.0f;
  TEST_ASSERT_TRUE(contiene(motivoBloqueoRemoto(1, true, AUT, c), "calor"));
  TEST_ASSERT_TRUE(contiene(motivoBloqueoRemoto(3, false, AUT, c), "calor"));

  c = normal();
  c.rawNH3 = 1600;
  TEST_ASSERT_TRUE(contiene(motivoBloqueoRemoto(1, true, AUT, c), "Gases"));

  c = normal();
  c.distanciaAgua = 2.0f;  // lleno
  TEST_ASSERT_TRUE(contiene(motivoBloqueoRemoto(4, true, AUT, c), "lleno"));
  c.distanciaAgua = 8.0f;  // bajo
  TEST_ASSERT_TRUE(contiene(motivoBloqueoRemoto(4, false, AUT, c), "bajo"));
}

// ─── Lecturas inválidas (fallo puntual) ──────────────────────────────────

void test_sin_lectura_valida_del_dht_no_se_autoriza_ir_hacia_lo_que_el_calor_prohibe()
{
  ContextoProtecciones c = normal();
  c.dhtValida = false;
  TEST_ASSERT_TRUE(contiene(motivoBloqueoRemoto(1, true, AUT, c), "DHT22"));
  TEST_ASSERT_TRUE(contiene(motivoBloqueoRemoto(2, false, AUT, c), "DHT22"));
  TEST_ASSERT_TRUE(contiene(motivoBloqueoRemoto(3, false, AUT, c), "DHT22"));
}

void test_sin_lectura_valida_del_dht_si_se_autoriza_el_lado_seguro()
{
  ContextoProtecciones c = normal();
  c.dhtValida = false;
  TEST_ASSERT_NULL(motivoBloqueoRemoto(1, false, AUT, c));  // apagar calefacción
  TEST_ASSERT_NULL(motivoBloqueoRemoto(2, true, AUT, c));   // encender ventilación
}

void test_un_fallo_puntual_no_revierte_un_manual_ya_aplicado()
{
  // Igual que la lógica automática, que conserva su última decisión.
  ContextoProtecciones c = normal();
  c.dhtValida = false;
  TEST_ASSERT_NULL(motivoBloqueoRemoto(1, true, SOS, c));
}

// ─── Lecturas sostenidas (obsoletas) ─────────────────────────────────────

void test_una_medida_sostenida_del_hcsr04_no_autoriza_la_bomba()
{
  ContextoProtecciones c = normal();
  c.aguaActual = false;  // estado OK, pero es la última medida buena repetida
  TEST_ASSERT_TRUE(contiene(motivoBloqueoRemoto(4, true, AUT, c), "sostenida"));
  TEST_ASSERT_TRUE(contiene(motivoBloqueoRemoto(4, false, AUT, c), "sostenida"));
}

void test_con_medida_sostenida_se_sigue_vigilando_el_manual_con_ella()
{
  ContextoProtecciones c = normal();
  c.aguaActual = false;
  c.distanciaAgua = 2.0f;  // lo último que se midió: lleno
  TEST_ASSERT_TRUE(contiene(motivoBloqueoRemoto(4, true, SOS, c), "lleno"));
}

// ─── Fallos persistentes y recuperación ──────────────────────────────────

void test_con_fallos_persistentes_manda_el_fail_safe()
{
  ContextoProtecciones c = normal();
  c.dhtEnError = true;
  TEST_ASSERT_TRUE(contiene(motivoBloqueoRemoto(1, false, AUT, c), "fail-safe"));
  TEST_ASSERT_TRUE(contiene(motivoBloqueoRemoto(2, true, SOS, c), "fail-safe"));

  c = normal();
  c.ultrasonicoEnError = true;
  TEST_ASSERT_TRUE(contiene(motivoBloqueoRemoto(4, true, SOS, c), "fail-safe"));
}

void test_al_recuperarse_el_sensor_se_vuelve_a_autorizar()
{
  ContextoProtecciones c = normal();
  c.dhtValida = false;
  TEST_ASSERT_NOT_NULL(motivoBloqueoRemoto(1, true, AUT, c));
  c.dhtValida = true;  // ciclo siguiente, lectura válida
  TEST_ASSERT_NULL(motivoBloqueoRemoto(1, true, AUT, c));

  c = normal();
  c.aguaActual = false;
  TEST_ASSERT_NOT_NULL(motivoBloqueoRemoto(4, true, AUT, c));
  c.aguaActual = true;
  TEST_ASSERT_NULL(motivoBloqueoRemoto(4, true, AUT, c));
}

void test_fuera_de_monitoring_no_se_autoriza_nada()
{
  ContextoProtecciones c = normal();
  c.sistemaEnMonitoreo = false;
  for (uint8_t rele = 1; rele <= 4; rele++)
  {
    TEST_ASSERT_NOT_NULL(motivoBloqueoRemoto(rele, true, AUT, c));
    TEST_ASSERT_NOT_NULL(motivoBloqueoRemoto(rele, false, SOS, c));
  }
}

// Mismo archivo para el host (`pio test -e native`, con main) y para la placa
// (`pio test -e esp32dev`, con setup/loop del framework Arduino).
static int ejecutarPruebas()
{
  UNITY_BEGIN();
  RUN_TEST(test_con_lecturas_validas_se_autoriza_lo_seguro);
  RUN_TEST(test_las_restricciones_de_la_logica_automatica_se_mantienen);
  RUN_TEST(test_sin_lectura_valida_del_dht_no_se_autoriza_ir_hacia_lo_que_el_calor_prohibe);
  RUN_TEST(test_sin_lectura_valida_del_dht_si_se_autoriza_el_lado_seguro);
  RUN_TEST(test_un_fallo_puntual_no_revierte_un_manual_ya_aplicado);
  RUN_TEST(test_una_medida_sostenida_del_hcsr04_no_autoriza_la_bomba);
  RUN_TEST(test_con_medida_sostenida_se_sigue_vigilando_el_manual_con_ella);
  RUN_TEST(test_con_fallos_persistentes_manda_el_fail_safe);
  RUN_TEST(test_al_recuperarse_el_sensor_se_vuelve_a_autorizar);
  RUN_TEST(test_fuera_de_monitoring_no_se_autoriza_nada);
  return UNITY_END();
}

#ifdef ARDUINO
#include <Arduino.h>
void setup()
{
  delay(2000);  // da tiempo a abrir el monitor serie
  ejecutarPruebas();
}
void loop() {}
#else
int main()
{
  return ejecutarPruebas();
}
#endif
