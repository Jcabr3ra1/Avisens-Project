from fastapi.testclient import TestClient

from main import app
from modelos.anomalias import detectar

client = TestClient(app)


def tipos(resultado):
    return [a["tipo"] for a in resultado["anomalias"]]


def pesos(*pares):
    return [{"dia": dia, "peso": peso} for dia, peso in pares]


def consumos(*pares):
    return [{"dia": dia, "consumo_acum_kg": kg} for dia, kg in pares]


def mortalidades(*pares):
    return [{"dia": dia, "mortalidad_pct": pct} for dia, pct in pares]


def test_un_lote_sano_no_genera_alertas():
    resultado = detectar(
        pesajes=pesos((7, 180), (14, 500), (21, 1000), (28, 1650)),
        consumos=consumos((7, 120), (14, 400), (21, 900), (28, 1600)),
        mortalidades=mortalidades((7, 0.2), (14, 0.5), (21, 0.8), (28, 1.1)),
    )

    assert resultado["anomalias"] == []
    assert resultado["resumen"] == {"total": 0, "severidad_maxima": "ninguna"}


def test_detecta_peso_que_baja():
    resultado = detectar(pesajes=pesos((7, 180), (14, 500), (21, 450)))

    assert "peso_descendente" in tipos(resultado)
    assert resultado["resumen"]["severidad_maxima"] == "alta"


def test_detecta_ganancia_de_peso_muy_lenta():
    resultado = detectar(pesajes=pesos((7, 180), (14, 500), (21, 900), (28, 1000)))

    assert "ganancia_lenta" in tipos(resultado)


def test_detecta_peso_por_debajo_de_la_curva():
    curva = [{"dia": 21, "peso": 1000}]

    leve = detectar(pesajes=pesos((21, 820)), curva_referencia=curva)
    grave = detectar(pesajes=pesos((21, 700)), curva_referencia=curva)

    assert leve["anomalias"][0]["tipo"] == "bajo_curva"
    assert leve["anomalias"][0]["severidad"] == "media"
    assert grave["anomalias"][0]["severidad"] == "alta"


def test_detecta_caida_de_consumo():
    resultado = detectar(consumos=consumos((7, 100), (14, 400), (21, 800), (28, 900)))

    assert "caida_consumo" in tipos(resultado)


def test_consumo_acumulado_que_baja_es_dato_inconsistente():
    resultado = detectar(consumos=consumos((7, 100), (14, 400), (21, 300)))

    assert "consumo_inconsistente" in tipos(resultado)


def test_detecta_pico_de_mortalidad():
    resultado = detectar(
        mortalidades=mortalidades((7, 0.2), (14, 0.5), (21, 0.8), (28, 3.5))
    )

    assert "pico_mortalidad" in tipos(resultado)
    assert resultado["resumen"]["severidad_maxima"] == "alta"


def test_mortalidad_acumulada_que_baja_es_dato_inconsistente():
    resultado = detectar(mortalidades=mortalidades((7, 1.0), (14, 0.5)))

    assert "mortalidad_inconsistente" in tipos(resultado)


def test_ordena_primero_lo_mas_grave():
    resultado = detectar(
        pesajes=pesos((7, 180), (14, 500), (21, 450)),
        curva_referencia=[{"dia": 14, "peso": 590}],
    )

    severidades = [a["severidad"] for a in resultado["anomalias"]]
    assert severidades == sorted(severidades, key=["alta", "media", "baja"].index)


def test_endpoint_devuelve_alertas_con_mensaje_en_espanol():
    cuerpo = {"pesajes": pesos((7, 180), (14, 500), (21, 450))}

    respuesta = client.post("/anomalias", json=cuerpo)

    assert respuesta.status_code == 200
    primera = respuesta.json()["anomalias"][0]
    assert primera["tipo"] == "peso_descendente"
    assert "bajó" in primera["mensaje"]
    assert "X-ML-Huella" in respuesta.headers


def test_endpoint_rechaza_peticiones_invalidas():
    vacia = {}
    dias_repetidos = {"pesajes": pesos((7, 180), (7, 200))}
    campo_extra = {"pesajes": pesos((7, 180)), "inesperado": 1}

    for cuerpo in (vacia, dias_repetidos, campo_extra):
        assert client.post("/anomalias", json=cuerpo).status_code == 422
