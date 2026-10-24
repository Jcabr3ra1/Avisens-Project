import logging
import os
from contextlib import asynccontextmanager
from secrets import compare_digest
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, status

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


logger = logging.getLogger("avisens-ml")


@asynccontextmanager
async def ciclo_de_vida(_: FastAPI):
    if not os.getenv("ML_INTERNAL_TOKEN"):
        logger.warning(
            "ML_INTERNAL_TOKEN no esta definido: el servicio acepta peticiones sin token"
        )
    yield


app = FastAPI(title="Avisens ML", lifespan=ciclo_de_vida)


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
