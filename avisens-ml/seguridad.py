import hashlib
import os
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, Response, status

TAMANO_MAXIMO_BYTES = 262_144
PETICIONES_POR_MINUTO = 300
VENTANA_SEGUNDOS = 60
LARGO_HUELLA = 16


class LimitadorVentana:
    def __init__(self, limite, ventana_segundos):
        self.limite = limite
        self.ventana_segundos = ventana_segundos
        self._marcas = defaultdict(deque)

    def permitir(self, cliente):
        ahora = time.monotonic()
        marcas = self._marcas[cliente]
        while marcas and ahora - marcas[0] > self.ventana_segundos:
            marcas.popleft()
        if len(marcas) >= self.limite:
            return False
        marcas.append(ahora)
        return True

    def reiniciar(self):
        self._marcas.clear()


limitador = LimitadorVentana(PETICIONES_POR_MINUTO, VENTANA_SEGUNDOS)


def servicio_abierto_permitido():
    return os.getenv("ML_PERMITIR_SIN_TOKEN") == "true"


def exigir_token_configurado(esperado):
    if esperado or servicio_abierto_permitido():
        return
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Servicio sin token interno configurado",
    )


def huella_de(cuerpo: bytes):
    return hashlib.sha256(cuerpo).hexdigest()[:LARGO_HUELLA]


async def registrar_huella(request: Request, response: Response):
    response.headers["X-ML-Huella"] = huella_de(await request.body())
