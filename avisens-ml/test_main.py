from fastapi.testclient import TestClient

from main import app
from prediccion import predecir_consumo, predecir_mortalidad


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
    assert cuerpo["modelo"]["version"] == "1.1.0"
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
