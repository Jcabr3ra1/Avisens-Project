from fastapi.testclient import TestClient

from main import app
from modelos.polinomial import predecir_consumo, predecir_mortalidad


client = TestClient(app)


def peticion_valida():
    return {
        "pesajes": [
            {"dia": 7, "peso": 180},
            {"dia": 14, "peso": 500},
            {"dia": 21, "peso": 1000},
        ],
        "dia_faena": 42,
        "peso_objetivo_g": 2500,
    }


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_prediccion_incluye_trazabilidad_del_modelo():
    respuesta = client.post("/predecir", json=peticion_valida())

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["peso_proyectado_faena_g"] > 0
    assert cuerpo["modelo"]["nombre"] == "crecimiento_aves"
    assert cuerpo["modelo"]["version"] == "1.2.0"
    assert 0 <= cuerpo["modelo"]["confianza"] <= 1
    assert cuerpo["modelo"]["puntos_usados"] == 3


def test_rechaza_dias_duplicados():
    peticion = peticion_valida()
    peticion["pesajes"][1]["dia"] = 7

    respuesta = client.post("/predecir", json=peticion)

    assert respuesta.status_code == 422


def test_rechaza_menos_de_tres_observaciones_y_campos_desconocidos():
    peticion = peticion_valida()
    peticion["pesajes"] = peticion["pesajes"][:2]
    peticion["campo_inesperado"] = True

    respuesta = client.post("/predecir", json=peticion)

    assert respuesta.status_code == 422


def test_rechaza_faena_anterior_a_la_ultima_observacion():
    peticion = peticion_valida()
    peticion["dia_faena"] = 21

    respuesta = client.post("/predecir", json=peticion)

    assert respuesta.status_code == 422


def test_exige_token_cuando_el_servicio_esta_protegido(monkeypatch):
    monkeypatch.setenv("ML_INTERNAL_TOKEN", "secreto-interno")

    sin_token = client.post("/predecir", json=peticion_valida())
    con_token = client.post(
        "/predecir",
        json=peticion_valida(),
        headers={"X-ML-Token": "secreto-interno"},
    )

    assert sin_token.status_code == 401
    assert con_token.status_code == 200
    monkeypatch.delenv("ML_INTERNAL_TOKEN")


def test_mortalidad_se_mantiene_en_un_rango_valido():
    resultado = predecir_mortalidad(
        [
            {"dia": 7, "mortalidad_pct": 10},
            {"dia": 14, "mortalidad_pct": 50},
            {"dia": 21, "mortalidad_pct": 95},
        ],
        42,
    )

    assert 0 <= resultado["mortalidad_proyectada_pct"] <= 100


def test_consumo_proyectado_nunca_es_negativo():
    resultado = predecir_consumo(
        [
            {"dia": 7, "consumo_acum_kg": 100},
            {"dia": 14, "consumo_acum_kg": 90},
            {"dia": 21, "consumo_acum_kg": 20},
        ],
        42,
    )

    assert resultado["consumo_proyectado_kg"] >= 0


def peticion_curva():
    return {
        "pesajes": [
            {"dia": 7, "peso": 200},
            {"dia": 14, "peso": 505},
            {"dia": 21, "peso": 960},
        ],
        "dia_final": 42,
        "curva_referencia": [
            {"dia": 7, "peso": 213},
            {"dia": 21, "peso": 1012},
            {"dia": 42, "peso": 2998},
        ],
        "peso_objetivo_g": 2800,
    }


def test_curva_crecimiento_devuelve_la_serie_lista_para_graficar():
    respuesta = client.post("/curva-crecimiento", json=peticion_curva())

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert len(cuerpo["serie"]) == 42
    assert set(cuerpo["serie"][0]) == {"dia", "peso_g", "min_g", "max_g"}
    assert cuerpo["dia_al_objetivo"] is not None
    assert cuerpo["modelo"]["nombre"] == "crecimiento_gompertz"
    assert cuerpo["modelo"]["puntos_usados"] == 3


def test_curva_crecimiento_acepta_un_solo_pesaje_sin_curva_ni_objetivo():
    respuesta = client.post(
        "/curva-crecimiento",
        json={"pesajes": [{"dia": 10, "peso": 300}], "dia_final": 42},
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["dia_al_objetivo"] is None


def test_curva_crecimiento_rechaza_peticiones_invalidas():
    sin_pesajes = {**peticion_curva(), "pesajes": []}
    dia_repetido = peticion_curva()
    dia_repetido["pesajes"][1]["dia"] = 7
    curva_repetida = peticion_curva()
    curva_repetida["curva_referencia"][1]["dia"] = 7
    curva_dia_cero = peticion_curva()
    curva_dia_cero["curva_referencia"][0]["dia"] = 0
    final_vencido = {**peticion_curva(), "dia_final": 21}
    campo_extra = {**peticion_curva(), "inesperado": True}

    for cuerpo in (
        sin_pesajes,
        dia_repetido,
        curva_repetida,
        curva_dia_cero,
        final_vencido,
        campo_extra,
    ):
        assert client.post("/curva-crecimiento", json=cuerpo).status_code == 422


def test_curva_crecimiento_exige_token_cuando_el_servicio_esta_protegido(
    monkeypatch,
):
    monkeypatch.setenv("ML_INTERNAL_TOKEN", "secreto-interno")

    sin_token = client.post("/curva-crecimiento", json=peticion_curva())
    con_token = client.post(
        "/curva-crecimiento",
        json=peticion_curva(),
        headers={"X-ML-Token": "secreto-interno"},
    )

    assert sin_token.status_code == 401
    assert con_token.status_code == 200


def peticion_calor():
    return {
        "horas": [
            {"hora": "2026-10-18T12:00", "temperatura": 30, "humedad": 70},
            {"hora": "2026-10-18T14:00", "temperatura": 33, "humedad": 70},
        ],
        "ajuste_temperatura": 2.5,
        "dia_vida": 30,
    }


def test_riesgo_calor_devuelve_la_serie_y_el_pico():
    respuesta = client.post("/riesgo-calor", json=peticion_calor())

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert len(cuerpo["serie"]) == 2
    assert cuerpo["pico"]["hora"] == "2026-10-18T14:00"
    assert cuerpo["nivel_maximo"] == "alerta"
    assert cuerpo["modelo"]["nombre"] == "estres_calor_thi"


def test_riesgo_calor_rechaza_peticiones_invalidas():
    sin_horas = {**peticion_calor(), "horas": []}
    humedad_imposible = peticion_calor()
    humedad_imposible["horas"][0]["humedad"] = 150
    dia_cero = {**peticion_calor(), "dia_vida": 0}
    campo_extra = {**peticion_calor(), "inesperado": True}

    for cuerpo in (sin_horas, humedad_imposible, dia_cero, campo_extra):
        assert client.post("/riesgo-calor", json=cuerpo).status_code == 422
