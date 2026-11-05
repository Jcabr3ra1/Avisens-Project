from fastapi.testclient import TestClient

import seguridad
from main import app

client = TestClient(app)


def peticion():
    return {
        "pesajes": [
            {"dia": 7, "peso": 180},
            {"dia": 14, "peso": 500},
            {"dia": 21, "peso": 1000},
        ]
    }


def test_sin_token_configurado_el_servicio_se_cierra(monkeypatch):
    monkeypatch.delenv("ML_PERMITIR_SIN_TOKEN")

    respuesta = client.post("/predecir", json=peticion())

    assert respuesta.status_code == 503
    assert client.get("/health").status_code == 200


def test_el_modo_abierto_solo_se_activa_de_forma_explicita(monkeypatch):
    monkeypatch.setenv("ML_PERMITIR_SIN_TOKEN", "si")

    assert client.post("/predecir", json=peticion()).status_code == 503


def test_rechaza_cuerpos_demasiado_grandes():
    relleno = "x" * (seguridad.TAMANO_MAXIMO_BYTES + 1)

    respuesta = client.post(
        "/predecir",
        content=relleno,
        headers={"Content-Type": "application/json"},
    )

    assert respuesta.status_code == 413


def test_limita_la_frecuencia_de_peticiones(monkeypatch):
    monkeypatch.setattr(seguridad.limitador, "limite", 3)

    codigos = [client.post("/predecir", json=peticion()).status_code for _ in range(5)]

    assert codigos == [200, 200, 200, 429, 429]
    assert client.get("/health").status_code == 200


def test_cada_prediccion_trae_una_huella_de_su_entrada():
    primera = client.post("/predecir", json=peticion())
    repetida = client.post("/predecir", json=peticion())
    otra = peticion()
    otra["pesajes"][0]["peso"] = 181
    distinta = client.post("/predecir", json=otra)

    huella = primera.headers["X-ML-Huella"]
    assert len(huella) == 16
    assert repetida.headers["X-ML-Huella"] == huella
    assert distinta.headers["X-ML-Huella"] != huella
