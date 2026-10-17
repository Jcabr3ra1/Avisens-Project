import os
from secrets import compare_digest
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, model_validator
from prediccion import predecir, predecir_mortalidad, predecir_consumo


class Pesaje(BaseModel):
    model_config = ConfigDict(extra="forbid")
    dia: int = Field(ge=0, le=100)
    peso: float = Field(gt=0, le=10000, allow_inf_nan=False)


class PeticionPrediccion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pesajes: Annotated[list[Pesaje], Field(min_length=3, max_length=100)]
    dia_faena: int = Field(default=42, ge=1, le=100)
    peso_objetivo_g: float = Field(default=2500, gt=0, le=10000, allow_inf_nan=False)

    @model_validator(mode="after")
    def validar_serie(self):
        _validar_dias(self.pesajes, self.dia_faena)
        return self


class Mortalidad(BaseModel):
    model_config = ConfigDict(extra="forbid")
    dia: int = Field(ge=0, le=100)
    mortalidad_pct: float = Field(ge=0, le=100, allow_inf_nan=False)


class PeticionMortalidad(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mortalidades: Annotated[list[Mortalidad], Field(min_length=3, max_length=100)]
    dia_faena: int = Field(default=42, ge=1, le=100)

    @model_validator(mode="after")
    def validar_serie(self):
        _validar_dias(self.mortalidades, self.dia_faena)
        return self


class Consumo(BaseModel):
    model_config = ConfigDict(extra="forbid")
    dia: int = Field(ge=0, le=100)
    consumo_acum_kg: float = Field(ge=0, le=1000000, allow_inf_nan=False)


class PeticionConsumo(BaseModel):
    model_config = ConfigDict(extra="forbid")
    consumos: Annotated[list[Consumo], Field(min_length=3, max_length=100)]
    dia_faena: int = Field(default=42, ge=1, le=100)

    @model_validator(mode="after")
    def validar_serie(self):
        _validar_dias(self.consumos, self.dia_faena)
        return self


def _validar_dias(observaciones, dia_faena):
    dias = [observacion.dia for observacion in observaciones]
    if len(set(dias)) != len(dias):
        raise ValueError("Cada observacion debe pertenecer a un dia distinto")
    if max(dias) >= dia_faena:
        raise ValueError("dia_faena debe ser posterior a la ultima observacion")


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
