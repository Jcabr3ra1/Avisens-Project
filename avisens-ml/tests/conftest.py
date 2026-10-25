import pytest

import seguridad


@pytest.fixture(autouse=True)
def entorno_de_pruebas(monkeypatch):
    monkeypatch.delenv("ML_INTERNAL_TOKEN", raising=False)
    monkeypatch.setenv("ML_PERMITIR_SIN_TOKEN", "true")
    seguridad.limitador.reiniciar()
