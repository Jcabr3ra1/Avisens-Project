from fastapi.testclient import TestClient

from main import app
from modelos.polinomial import predecir, predecir_consumo, predecir_mortalidad

client = TestClient(app)


def serie(campo, puntos):
    return [{"dia": dia, campo: valor} for dia, valor in puntos]


def test_confianza_con_tres_puntos_no_es_perfecta():
    pesajes = serie("peso", [(7, 180), (14, 500), (21, 1000)])

    resultado = predecir(pesajes, 42, 2500)

    assert resultado["modelo"]["confianza"] < 0.5


def test_confianza_crece_con_mas_observaciones():
    pocos = serie("peso", [(7, 180), (14, 500), (21, 1000)])
    muchos = serie(
        "peso",
        [(7, 180), (10, 300), (14, 500), (17, 740), (21, 1000), (24, 1290), (28, 1650)],
    )

    assert (
        predecir(muchos, 42, 2500)["modelo"]["confianza"]
        > predecir(pocos, 42, 2500)["modelo"]["confianza"]
    )


def test_peso_proyectado_no_baja_del_ultimo_pesaje():
    pesajes = serie("peso", [(7, 180), (14, 900), (21, 1000)])

    resultado = predecir(pesajes, 42, 2500)

    assert resultado["peso_proyectado_faena_g"] >= 1000


def test_peso_proyectado_no_supera_el_maximo_fisico():
    pesajes = serie("peso", [(7, 100), (14, 150), (21, 900)])

    resultado = predecir(pesajes, 100, 2500)

    assert resultado["peso_proyectado_faena_g"] <= 10000


def test_dias_al_objetivo_no_cae_en_un_dia_ya_observado():
    pesajes = serie("peso", [(10, 3000), (20, 2000), (30, 2400)])

    resultado = predecir(pesajes, 42, 2500)

    assert resultado["dias_al_objetivo"] is None or resultado["dias_al_objetivo"] >= 30


def test_dias_al_objetivo_es_el_ultimo_dia_si_el_objetivo_ya_se_alcanzo():
    pesajes = serie("peso", [(14, 500), (28, 1800), (35, 2600)])

    resultado = predecir(pesajes, 42, 2500)

    assert resultado["dias_al_objetivo"] == 35


def test_mortalidad_acumulada_no_baja_de_lo_observado():
    mortalidades = serie("mortalidad_pct", [(7, 1.0), (14, 3.0), (21, 3.0)])

    resultado = predecir_mortalidad(mortalidades, 42)

    assert resultado["mortalidad_proyectada_pct"] >= 3.0


def test_consumo_acumulado_no_baja_de_lo_observado():
    consumos = serie("consumo_acum_kg", [(7, 50), (14, 150), (21, 200)])

    resultado = predecir_consumo(consumos, 42)

    assert resultado["consumo_proyectado_kg"] >= 200


def test_rechaza_hora_sin_formato_iso():
    cuerpo = {"horas": [{"hora": "no es una hora!", "temperatura": 30, "humedad": 60}]}

    assert client.post("/riesgo-calor", json=cuerpo).status_code == 422


def test_acepta_hora_iso_de_open_meteo():
    cuerpo = {"horas": [{"hora": "2026-10-18T14:00", "temperatura": 30, "humedad": 60}]}

    assert client.post("/riesgo-calor", json=cuerpo).status_code == 200
