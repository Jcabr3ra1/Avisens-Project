import pytest


@pytest.fixture(autouse=True)
def sin_token_interno(monkeypatch):
    monkeypatch.delenv("ML_INTERNAL_TOKEN", raising=False)
