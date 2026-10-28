// Pruebas del búfer de lecturas sin red: orden, desborde y rechazo de
// entradas que no caben. Se ejecutan con `pio test -e native`.
#include <unity.h>
#include <stdio.h>
#include <string.h>
#include "BufferLecturas.h"

void setUp() {}
void tearDown() {}

void test_empieza_vacio()
{
  BufferLecturas<3> b;
  TEST_ASSERT_TRUE(b.vacio());
  TEST_ASSERT_NULL(b.masVieja());
  b.quitarMasVieja();
  TEST_ASSERT_EQUAL(0, b.cantidad());
}

void test_sale_en_el_orden_en_que_entro()
{
  BufferLecturas<3> b;
  b.agregar("a", 100, "{\"codigo\":\"T\",\"valor\":1}");
  b.agregar("b", 105, "{\"codigo\":\"T\",\"valor\":2}");
  TEST_ASSERT_EQUAL_STRING("a", b.masVieja()->idLote);
  TEST_ASSERT_EQUAL_INT64(100, b.masVieja()->epoch);
  b.quitarMasVieja();
  TEST_ASSERT_EQUAL_STRING("b", b.masVieja()->idLote);
  b.quitarMasVieja();
  TEST_ASSERT_TRUE(b.vacio());
}

void test_lleno_descarta_la_mas_vieja()
{
  BufferLecturas<2> b;
  TEST_ASSERT_FALSE(b.agregar("a", 1, "x"));
  TEST_ASSERT_FALSE(b.agregar("b", 2, "x"));
  TEST_ASSERT_TRUE(b.agregar("c", 3, "x"));
  TEST_ASSERT_EQUAL(2, b.cantidad());
  TEST_ASSERT_EQUAL_STRING("b", b.masVieja()->idLote);
  b.quitarMasVieja();
  TEST_ASSERT_EQUAL_STRING("c", b.masVieja()->idLote);
}

void test_da_la_vuelta_muchas_veces_sin_perder_el_orden()
{
  BufferLecturas<3> b;
  char id[8];
  for (int i = 0; i < 20; i++)
  {
    snprintf(id, sizeof(id), "id%d", i);
    b.agregar(id, i, "x");
  }
  TEST_ASSERT_EQUAL(3, b.cantidad());
  TEST_ASSERT_EQUAL_STRING("id17", b.masVieja()->idLote);
  b.quitarMasVieja();
  TEST_ASSERT_EQUAL_STRING("id18", b.masVieja()->idLote);
  b.quitarMasVieja();
  TEST_ASSERT_EQUAL_STRING("id19", b.masVieja()->idLote);
}

void test_rechaza_lo_que_no_cabe_sin_cortarlo()
{
  BufferLecturas<2> b;
  char largo[900];
  memset(largo, 'x', sizeof(largo) - 1);
  largo[sizeof(largo) - 1] = '\0';
  bool guardada = true;
  b.agregar("a", 1, largo, &guardada);
  TEST_ASSERT_FALSE(guardada);
  TEST_ASSERT_TRUE(b.vacio());

  b.agregar("0123456789012345678901234567890123456789", 1, "x", &guardada);
  TEST_ASSERT_FALSE(guardada);
  TEST_ASSERT_TRUE(b.vacio());
}

void test_una_entrada_rechazada_no_descarta_otra()
{
  BufferLecturas<1> b;
  b.agregar("a", 1, "x");
  char largo[900];
  memset(largo, 'x', sizeof(largo) - 1);
  largo[sizeof(largo) - 1] = '\0';
  bool descarto = b.agregar("b", 2, largo);
  TEST_ASSERT_FALSE(descarto);
  TEST_ASSERT_EQUAL_STRING("a", b.masVieja()->idLote);
}

int main()
{
  UNITY_BEGIN();
  RUN_TEST(test_empieza_vacio);
  RUN_TEST(test_sale_en_el_orden_en_que_entro);
  RUN_TEST(test_lleno_descarta_la_mas_vieja);
  RUN_TEST(test_da_la_vuelta_muchas_veces_sin_perder_el_orden);
  RUN_TEST(test_rechaza_lo_que_no_cabe_sin_cortarlo);
  RUN_TEST(test_una_entrada_rechazada_no_descarta_otra);
  return UNITY_END();
}
