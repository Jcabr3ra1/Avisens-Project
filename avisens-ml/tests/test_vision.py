import io

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from main import app
from modelos.vision import _letterbox, _nms, detectar

client = TestClient(app)


def jpeg(ancho=640, alto=480, color=(90, 90, 90)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (ancho, alto), color).save(buffer, format="JPEG")
    return buffer.getvalue()


def test_imagen_lisa_no_tiene_pollos():
    r = detectar(jpeg(), 0.40)
    assert r["conteo"] == 0
    assert r["detecciones"] == []
    assert (r["ancho"], r["alto"]) == (640, 480)
    assert r["modelo"] == "yolo11n-pollos-v1"


def test_letterbox_respeta_la_proporcion():
    tensor, escala, relleno_x, relleno_y = _letterbox(Image.new("RGB", (320, 240)))
    assert tensor.shape == (1, 3, 640, 640)
    assert escala == 2.0
    # 320x240 escalado x2 = 640x480: el relleno va solo arriba y abajo.
    assert (relleno_x, relleno_y) == (0, 80)


def test_nms_quita_la_caja_repetida():
    cajas = np.array([[0, 0, 10, 10], [1, 1, 10, 10], [50, 50, 60, 60]], dtype=np.float32)
    puntajes = np.array([0.9, 0.8, 0.7], dtype=np.float32)
    assert sorted(_nms(cajas, puntajes, 0.7)) == [0, 2]


def test_endpoint_detecta_sobre_una_foto():
    r = client.post(
        "/vision/detectar", content=jpeg(), headers={"Content-Type": "image/jpeg"}
    )
    assert r.status_code == 200
    assert r.json()["conteo"] == 0


def test_endpoint_rechaza_lo_que_no_es_imagen():
    r = client.post("/vision/detectar", content=b"no soy una foto")
    assert r.status_code == 422


def test_endpoint_rechaza_cuerpo_vacio():
    r = client.post("/vision/detectar", content=b"")
    assert r.status_code == 422


def test_endpoint_exige_token_interno(monkeypatch):
    monkeypatch.setenv("ML_INTERNAL_TOKEN", "secreto")
    r = client.post("/vision/detectar", content=jpeg())
    assert r.status_code == 401
    r = client.post("/vision/detectar", content=jpeg(), headers={"X-ML-Token": "secreto"})
    assert r.status_code == 200
