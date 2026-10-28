from fastapi.testclient import TestClient

from main import app
from modelos.confianza import nivel_de_confianza
from modelos.polinomial import predecir, predecir_consumo, predecir_mortalidad


def serie(campo, puntos):
    return [{"dia": dia, campo: valor} for dia, valor in puntos]


PESOS_CORTOS = serie("peso", [(7, 180), (14, 500), (21, 1000)])
PESOS_LARGOS = serie(
    "peso",
    [
        (4, 95),
        (7, 180),
        (10, 300),
        (14, 500),
        (17, 740),
        (21, 1000),
        (24, 1290),
        (28, 1650),
        (31, 1960),
        (35, 2400),
    ],
)


def test_niveles_de_confianza():
    assert nivel_de_confianza(0.9) == "alta"
    assert nivel_de_confianza(0.6) == "media"
    assert nivel_de_confianza(0.3) == "baja"


def test_con_pocos_datos_la_confianza_es_baja_y_explica_por_que():
    modelo = predecir(PESOS_CORTOS, 42, 2500)["modelo"]

    assert modelo["nivel_confianza"] == "baja"
    assert any("3 mediciones" in motivo for motivo in modelo["motivos"])


def test_con_muchos_datos_buenos_la_confianza_sube():
    modelo = predecir(PESOS_LARGOS, 42, 2500)["modelo"]

    assert modelo["nivel_confianza"] == "alta"
    assert modelo["motivos"] == []


def test_el_rango_contiene_la_proyeccion():
    resultado = predecir(PESOS_LARGOS, 42, 2500)

    rango = resultado["rango"]
    assert rango["min"] <= resultado["peso_proyectado_faena_g"] <= rango["max"]
    assert rango["cobertura_pct"] == 90


def test_el_rango_es_mas_ancho_con_menos_datos():
    corto = predecir(PESOS_CORTOS, 42, 2500)["rango"]
    largo = predecir(PESOS_LARGOS, 42, 2500)["rango"]

    assert corto["max"] - corto["min"] > largo["max"] - largo["min"]


def test_el_rango_respeta_los_limites_fisicos():
    peso = predecir(PESOS_CORTOS, 42, 2500)["rango"]
    mortalidad = predecir_mortalidad(
        serie("mortalidad_pct", [(7, 1.0), (14, 3.0), (21, 6.0)]), 42
    )["rango"]
    consumo = predecir_consumo(
        serie("consumo_acum_kg", [(7, 50), (14, 150), (21, 200)]), 42
    )["rango"]

    assert peso["min"] >= 1000 and peso["max"] <= 10000
    assert mortalidad["min"] >= 6.0 and mortalidad["max"] <= 100
    assert consumo["min"] >= 200


def test_avisa_cuando_la_proyeccion_es_lejana():
    lejana = predecir(PESOS_CORTOS, 60, 2500)["modelo"]["motivos"]

    assert any("lejan" in motivo for motivo in lejana)


def test_calor_severo_amplia_el_rango_por_abajo_y_lo_explica():
    sin_calor = predecir(PESOS_LARGOS, 42, 2500)
    con_calor = predecir(PESOS_LARGOS, 42, 2500, horas_calor_severo=40)

    assert con_calor["peso_proyectado_faena_g"] == sin_calor["peso_proyectado_faena_g"]
    assert con_calor["rango"]["min"] < sin_calor["rango"]["min"]
    assert con_calor["rango"]["max"] == sin_calor["rango"]["max"]
    assert con_calor["factores"] == [{"factor": "calor_severo", "horas": 40}]
    assert any("calor" in m.lower() for m in con_calor["modelo"]["motivos"])


def test_calor_prolongado_baja_un_nivel_la_confianza():
    sin_calor = predecir(PESOS_LARGOS, 42, 2500)["modelo"]["nivel_confianza"]
    con_calor = predecir(PESOS_LARGOS, 42, 2500, horas_calor_severo=30)["modelo"]

    assert sin_calor == "alta"
    assert con_calor["nivel_confianza"] == "media"


def test_sin_calor_no_agrega_factores():
    assert predecir(PESOS_LARGOS, 42, 2500)["factores"] == []


def test_endpoint_acepta_las_horas_de_calor_severo():
    cuerpo = {
        "pesajes": PESOS_LARGOS,
        "dia_faena": 42,
        "horas_calor_severo": 12,
    }

    respuesta = TestClient(app).post("/predecir", json=cuerpo)

    assert respuesta.status_code == 200
    assert respuesta.json()["factores"][0]["horas"] == 12
    assert (
        TestClient(app)
        .post("/predecir", json={**cuerpo, "horas_calor_severo": 500})
        .status_code
        == 422
    )
