#include <unity.h>

#include "Frescura.h"

using namespace frescura;

static const uint32_t CERCA_DEL_DESBORDE = 0xFFFFF000u; // 4096 ms antes de volver a 0

void setUp() {}
void tearDown() {}

// --- transcurridoMs ---

void test_transcurrido_sin_desborde()
{
  TEST_ASSERT_EQUAL_UINT32(1500u, transcurridoMs(3500u, 2000u));
}

void test_transcurrido_atraviesa_el_desborde()
{
  TEST_ASSERT_EQUAL_UINT32(5000u, transcurridoMs(CERCA_DEL_DESBORDE + 5000u, CERCA_DEL_DESBORDE));
}

// --- tocaLecturaFisica (DHT22, 2000 ms) ---

void test_primera_lectura_siempre_toca()
{
  TEST_ASSERT_TRUE(tocaLecturaFisica(0u, 0u, false, 2000u));
  TEST_ASSERT_TRUE(tocaLecturaFisica(150u, 0u, false, 2000u));
}

void test_antes_de_2000_ms_no_toca()
{
  TEST_ASSERT_FALSE(tocaLecturaFisica(11999u, 10000u, true, 2000u));
}

void test_a_los_2000_ms_toca()
{
  TEST_ASSERT_TRUE(tocaLecturaFisica(12000u, 10000u, true, 2000u));
}

void test_intervalo_atraviesa_el_desborde()
{
  TEST_ASSERT_FALSE(tocaLecturaFisica(CERCA_DEL_DESBORDE + 1999u, CERCA_DEL_DESBORDE, true, 2000u));
  TEST_ASSERT_TRUE(tocaLecturaFisica(CERCA_DEL_DESBORDE + 2000u, CERCA_DEL_DESBORDE, true, 2000u));
}

// --- capturadaEnCiclo: ventana [inicioCiclo, publicado] ---

void test_lectura_del_ciclo_es_nueva()
{
  // Ciclo de 10000 a 11200 (p. ej. HX711 esperó ~1 s); DHT leído al inicio
  TEST_ASSERT_TRUE(capturadaEnCiclo(10000u, 10000u, 11200u));
  // HX711 terminó su conversión justo antes de publicar
  TEST_ASSERT_TRUE(capturadaEnCiclo(11180u, 10000u, 11200u));
  // Captura en el mismo milisegundo de publicar
  TEST_ASSERT_TRUE(capturadaEnCiclo(11200u, 10000u, 11200u));
}

void test_lectura_arrastrada_de_ciclo_anterior_no_es_nueva()
{
  // Ciclo anterior normal (2 s antes)
  TEST_ASSERT_FALSE(capturadaEnCiclo(8000u, 10000u, 11200u));
  // Caso que rompe un umbral fijo: el ciclo anterior se alargó (TARA ~11 s) y
  // su lectura tiene solo 1 ms respecto al inicio de este ciclo
  TEST_ASSERT_FALSE(capturadaEnCiclo(9999u, 10000u, 10050u));
}

void test_lectura_inicial_nunca_capturada_no_es_nueva()
{
  // getUltimaLectura() antes de cualquier lectura buena tiene timestamp 0
  TEST_ASSERT_FALSE(capturadaEnCiclo(0u, 10000u, 11200u));
}

void test_ventana_que_atraviesa_el_desborde()
{
  uint32_t inicio = CERCA_DEL_DESBORDE + 4000u; // 96 ms antes de volver a 0
  uint32_t publicado = inicio + 1200u;          // ya pasó por 0
  TEST_ASSERT_TRUE(capturadaEnCiclo(inicio + 50u, inicio, publicado));
  TEST_ASSERT_TRUE(capturadaEnCiclo(inicio + 1100u, inicio, publicado));
  TEST_ASSERT_FALSE(capturadaEnCiclo(inicio - 2000u, inicio, publicado));
}

// --- snapshotVigente (máx. 4000 ms) ---

void test_snapshot_vigente_hasta_el_umbral()
{
  TEST_ASSERT_TRUE(snapshotVigente(10000u, 10000u, 4000u));
  TEST_ASSERT_TRUE(snapshotVigente(14000u, 10000u, 4000u));
  TEST_ASSERT_FALSE(snapshotVigente(14001u, 10000u, 4000u));
}

void test_snapshot_vigente_atraviesa_el_desborde()
{
  TEST_ASSERT_TRUE(snapshotVigente(CERCA_DEL_DESBORDE + 4096u + 512u, CERCA_DEL_DESBORDE + 4096u - 512u, 4000u));
  TEST_ASSERT_FALSE(snapshotVigente(CERCA_DEL_DESBORDE + 4096u + 5000u, CERCA_DEL_DESBORDE, 4000u));
}

// --- esSnapshotNuevo ---

void test_primer_snapshot_es_nuevo()
{
  TEST_ASSERT_TRUE(esSnapshotNuevo(1u, false, 0u));
}

void test_mismo_snapshot_no_se_reenvia()
{
  TEST_ASSERT_FALSE(esSnapshotNuevo(7u, true, 7u));
  TEST_ASSERT_TRUE(esSnapshotNuevo(8u, true, 7u));
}

void test_secuencia_que_da_la_vuelta()
{
  TEST_ASSERT_TRUE(esSnapshotNuevo(0u, true, 0xFFFFFFFFu));
}

int main()
{
  UNITY_BEGIN();
  RUN_TEST(test_transcurrido_sin_desborde);
  RUN_TEST(test_transcurrido_atraviesa_el_desborde);
  RUN_TEST(test_primera_lectura_siempre_toca);
  RUN_TEST(test_antes_de_2000_ms_no_toca);
  RUN_TEST(test_a_los_2000_ms_toca);
  RUN_TEST(test_intervalo_atraviesa_el_desborde);
  RUN_TEST(test_lectura_del_ciclo_es_nueva);
  RUN_TEST(test_lectura_arrastrada_de_ciclo_anterior_no_es_nueva);
  RUN_TEST(test_lectura_inicial_nunca_capturada_no_es_nueva);
  RUN_TEST(test_ventana_que_atraviesa_el_desborde);
  RUN_TEST(test_snapshot_vigente_hasta_el_umbral);
  RUN_TEST(test_snapshot_vigente_atraviesa_el_desborde);
  RUN_TEST(test_primer_snapshot_es_nuevo);
  RUN_TEST(test_mismo_snapshot_no_se_reenvia);
  RUN_TEST(test_secuencia_que_da_la_vuelta);
  return UNITY_END();
}
