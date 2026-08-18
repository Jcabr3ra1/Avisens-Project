from fastapi import FastAPI
from pydantic import BaseModel
from prediccion import predecir


class Pesaje(BaseModel):
    dia: int
    peso: float


class PeticionPrediccion(BaseModel):
    pesajes: list[Pesaje]
    dia_faena: int = 42
    peso_objetivo_g: float = 2500


app = FastAPI(title="Avisens ML")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predecir")
def predecir_endpoint(peticion: PeticionPrediccion):
    pesajes = [p.model_dump() for p in peticion.pesajes]
    return predecir(pesajes, peticion.dia_faena, peticion.peso_objetivo_g)
