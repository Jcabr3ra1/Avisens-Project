import os
from secrets import compare_digest
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, status
from fastapi.concurrency import run_in_threadpool
from PIL import UnidentifiedImageError

from esquemas import (
    PeticionConsumo,
    PeticionCurvaCrecimiento,
    PeticionMortalidad,
    PeticionPrediccion,
    PeticionRiesgoCalor,
)
from modelos.estres_calor import proyectar_riesgo
from modelos.gompertz import proyectar_crecimiento
from modelos.polinomial import predecir, predecir_consumo, predecir_mortalidad
from modelos.vision import detectar


app = FastAPI(title="Avisens ML")


def validar_token_interno(
    x_ml_token: Annotated[str | None, Header()] = None,
):
    esperado = os.getenv("ML_INTERNAL_TOKEN")
    if esperado and (not x_ml_token or not compare_digest(x_ml_token, esperado)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token interno invalido",
        )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predecir", dependencies=[Depends(validar_token_interno)])
def predecir_endpoint(peticion: PeticionPrediccion):
    pesajes = [p.model_dump() for p in peticion.pesajes]
    return predecir(pesajes, peticion.dia_faena, peticion.peso_objetivo_g)


@app.post(
    "/predecir-mortalidad",
    dependencies=[Depends(validar_token_interno)],
)
def predecir_mortalidad_endpoint(peticion: PeticionMortalidad):
    datos = [m.model_dump() for m in peticion.mortalidades]
    return predecir_mortalidad(datos, peticion.dia_faena)


@app.post("/predecir-consumo", dependencies=[Depends(validar_token_interno)])
def predecir_consumo_endpoint(peticion: PeticionConsumo):
    datos = [c.model_dump() for c in peticion.consumos]
    return predecir_consumo(datos, peticion.dia_faena)


@app.post("/curva-crecimiento", dependencies=[Depends(validar_token_interno)])
def curva_crecimiento_endpoint(peticion: PeticionCurvaCrecimiento):
    return proyectar_crecimiento(
        [p.model_dump() for p in peticion.pesajes],
        peticion.dia_final,
        [p.model_dump() for p in peticion.curva_referencia],
        peticion.peso_objetivo_g,
    )


@app.post("/riesgo-calor", dependencies=[Depends(validar_token_interno)])
def riesgo_calor_endpoint(peticion: PeticionRiesgoCalor):
    return proyectar_riesgo(
        [hora.model_dump() for hora in peticion.horas],
        peticion.ajuste_temperatura,
        peticion.ajuste_humedad,
        peticion.dia_vida,
    )


# Una foto VGA en JPEG pesa ~25-40 KB; 2 MB deja margen sin aceptar cualquier cosa.
MAX_BYTES_FOTO = 2 * 1024 * 1024


@app.post("/vision/detectar", dependencies=[Depends(validar_token_interno)])
async def vision_detectar_endpoint(
    request: Request,
    confianza: Annotated[float, Query(ge=0.05, le=0.95)] = 0.40,
):
    # La foto llega tal cual en el cuerpo (image/jpeg), sin multipart: es lo
    # que el backend reenvía desde la ESP32-CAM.
    datos = await request.body()
    if not datos:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Falta la imagen")
    if len(datos) > MAX_BYTES_FOTO:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Imagen demasiado grande")
    try:
        # ~130 ms de CPU: en un hilo aparte para no frenar los demás endpoints.
        return await run_in_threadpool(detectar, datos, confianza)
    except UnidentifiedImageError:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "El archivo no es una imagen válida")
