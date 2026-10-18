from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, model_validator


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


class PuntoCurva(BaseModel):
    model_config = ConfigDict(extra="forbid")
    dia: int = Field(ge=1, le=100)
    peso: float = Field(gt=0, le=10000, allow_inf_nan=False)


class PeticionCurvaCrecimiento(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pesajes: Annotated[list[Pesaje], Field(min_length=1, max_length=100)]
    dia_final: int = Field(ge=1, le=100)
    curva_referencia: Annotated[list[PuntoCurva], Field(max_length=100)] = []
    peso_objetivo_g: float | None = Field(
        default=None, gt=0, le=10000, allow_inf_nan=False
    )

    @model_validator(mode="after")
    def validar_serie(self):
        _validar_dias(self.pesajes, self.dia_final)
        dias_curva = [punto.dia for punto in self.curva_referencia]
        if len(set(dias_curva)) != len(dias_curva):
            raise ValueError("Cada punto de la curva debe pertenecer a un dia distinto")
        return self


class HoraClima(BaseModel):
    model_config = ConfigDict(extra="forbid")
    hora: str = Field(min_length=10, max_length=25)
    temperatura: float = Field(ge=-20, le=60, allow_inf_nan=False)
    humedad: float = Field(ge=0, le=100, allow_inf_nan=False)


class PeticionRiesgoCalor(BaseModel):
    model_config = ConfigDict(extra="forbid")
    horas: Annotated[list[HoraClima], Field(min_length=1, max_length=168)]
    ajuste_temperatura: float = Field(default=0, ge=-50, le=50, allow_inf_nan=False)
    ajuste_humedad: float = Field(default=0, ge=-100, le=100, allow_inf_nan=False)
    dia_vida: int | None = Field(default=None, ge=1, le=100)
