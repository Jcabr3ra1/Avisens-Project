"""Detección de pollos en una foto con el modelo YOLO exportado a ONNX.

El modelo (modelos/vision/pollos-v1.onnx) es un YOLO11n afinado con fotos de
galpones (una clase: broiler). Corre con onnxruntime, sin PyTorch: la imagen
del servicio crece unos MB en lugar de varios GB.

Reproduce el pre y post-proceso de Ultralytics: letterbox a 640 manteniendo
la proporción, filtro por confianza y NMS. La salida del modelo es
(1, 4 + clases, 8400): cx, cy, w, h y una puntuación por clase.
"""

import io
import time
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image

RUTA_MODELO = Path(__file__).resolve().parent / "vision" / "pollos-v1.onnx"
NOMBRE_MODELO = "yolo11n-pollos-v1"
CLASES = ["broiler"]
TAMANO = 640
IOU_NMS = 0.7  # el mismo valor por defecto de Ultralytics
# Una caja casi entera dentro de otra mejor es el mismo pollo visto dos veces
# (pasa con pollos grandes y cerca de la cámara). El IoU no la quita porque la
# caja pequeña baja la unión; esto mide qué fracción de ella queda dentro.
CONTENIDA_NMS = 0.85


@lru_cache(maxsize=1)
def _sesion():
    # Import diferido: el resto del servicio arranca aunque falte onnxruntime.
    import onnxruntime as ort

    opciones = ort.SessionOptions()
    opciones.intra_op_num_threads = 2
    return ort.InferenceSession(
        str(RUTA_MODELO), sess_options=opciones, providers=["CPUExecutionProvider"]
    )


def _letterbox(imagen: Image.Image):
    """Escala la imagen al lado mayor de 640 y rellena con gris (114)."""
    ancho, alto = imagen.size
    escala = min(TAMANO / ancho, TAMANO / alto)
    nuevo_ancho, nuevo_alto = round(ancho * escala), round(alto * escala)
    reducida = imagen.resize((nuevo_ancho, nuevo_alto), Image.BILINEAR)
    lienzo = Image.new("RGB", (TAMANO, TAMANO), (114, 114, 114))
    relleno_x = (TAMANO - nuevo_ancho) // 2
    relleno_y = (TAMANO - nuevo_alto) // 2
    lienzo.paste(reducida, (relleno_x, relleno_y))
    tensor = np.asarray(lienzo, dtype=np.float32).transpose(2, 0, 1)[None] / 255.0
    return tensor, escala, relleno_x, relleno_y


def _nms(
    cajas: np.ndarray,
    puntajes: np.ndarray,
    umbral: float,
    contenida: float = CONTENIDA_NMS,
) -> list[int]:
    """Supresión de no-máximos: de las cajas que se solapan, o de las que
    quedan casi enteras dentro de otra, deja la mejor."""
    orden = puntajes.argsort()[::-1]
    areas = (cajas[:, 2] - cajas[:, 0]) * (cajas[:, 3] - cajas[:, 1])
    elegidas = []
    while orden.size:
        i = orden[0]
        elegidas.append(int(i))
        x1 = np.maximum(cajas[i, 0], cajas[orden[1:], 0])
        y1 = np.maximum(cajas[i, 1], cajas[orden[1:], 1])
        x2 = np.minimum(cajas[i, 2], cajas[orden[1:], 2])
        y2 = np.minimum(cajas[i, 3], cajas[orden[1:], 3])
        inter = np.clip(x2 - x1, 0, None) * np.clip(y2 - y1, 0, None)
        iou = inter / (areas[i] + areas[orden[1:]] - inter + 1e-9)
        dentro = inter / (np.minimum(areas[i], areas[orden[1:]]) + 1e-9)
        orden = orden[1:][(iou <= umbral) & (dentro < contenida)]
    return elegidas


def detectar(imagen_bytes: bytes, confianza: float = 0.40) -> dict:
    """Detecta pollos en una foto (JPEG/PNG). Cajas en píxeles de la foto."""
    inicio = time.perf_counter()
    imagen = Image.open(io.BytesIO(imagen_bytes)).convert("RGB")
    ancho, alto = imagen.size
    tensor, escala, relleno_x, relleno_y = _letterbox(imagen)

    sesion = _sesion()
    salida = sesion.run(None, {sesion.get_inputs()[0].name: tensor})[0][0].T
    puntajes_clase = salida[:, 4:]
    clase = puntajes_clase.argmax(axis=1)
    puntajes = puntajes_clase[np.arange(len(clase)), clase]
    validas = puntajes >= confianza

    detecciones = []
    if validas.any():
        cx, cy, w, h = (salida[validas, i] for i in range(4))
        cajas = np.stack([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], axis=1)
        puntajes, clase = puntajes[validas], clase[validas]
        for i in _nms(cajas, puntajes, IOU_NMS):
            x1, y1, x2, y2 = cajas[i]
            # Deshace el letterbox: de la imagen de 640 a la foto original.
            x1 = float(np.clip((x1 - relleno_x) / escala, 0, ancho))
            x2 = float(np.clip((x2 - relleno_x) / escala, 0, ancho))
            y1 = float(np.clip((y1 - relleno_y) / escala, 0, alto))
            y2 = float(np.clip((y2 - relleno_y) / escala, 0, alto))
            detecciones.append(
                {
                    "x1": round(x1, 1),
                    "y1": round(y1, 1),
                    "x2": round(x2, 1),
                    "y2": round(y2, 1),
                    "confianza": round(float(puntajes[i]), 3),
                    "clase": CLASES[int(clase[i])],
                }
            )

    detecciones.sort(key=lambda d: d["confianza"], reverse=True)
    return {
        "modelo": NOMBRE_MODELO,
        "ancho": ancho,
        "alto": alto,
        "conteo": len(detecciones),
        "detecciones": detecciones,
        "duracion_ms": round((time.perf_counter() - inicio) * 1000, 1),
    }
