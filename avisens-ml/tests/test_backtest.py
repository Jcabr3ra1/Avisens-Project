import numpy as np

from evaluacion.backtest import retrospectiva
from modelos.gompertz import gompertz

PARAMETROS = np.log([5500, 4.8, 0.051])
DIAS = [4, 7, 10, 14, 17, 21, 24, 28, 31, 35]
ESCENARIOS = [(21, 35), (28, 35), (14, 28), (21, 28), (24, 31), (17, 24)]


def ciclos_simulados(cantidad=300, semilla=7):
    azar = np.random.default_rng(semilla)
    ciclos = []
    for _ in range(cantidad):
        factor = azar.normal(1, 0.05)
        ciclos.append(
            [
                {
                    "dia": dia,
                    "peso": float(
                        gompertz(np.array(float(dia)), PARAMETROS)
                        * factor
                        * azar.normal(1, 0.04)
                    ),
                }
                for dia in DIAS
            ]
        )
    return ciclos


def test_el_rango_del_90_cubre_de_verdad_cerca_del_90():
    ciclos = ciclos_simulados()

    coberturas = [retrospectiva(ciclos, c, o)["cobertura_pct"] for c, o in ESCENARIOS]

    assert min(coberturas) >= 80
    assert sum(coberturas) / len(coberturas) >= 88


def test_reporta_el_error_medio_en_porcentaje():
    resultado = retrospectiva(ciclos_simulados(), 21, 35)

    assert resultado["ciclos"] == 300
    assert 0 < resultado["error_medio_pct"] < 20


def test_sin_ciclos_utiles_no_inventa_metricas():
    resultado = retrospectiva([[{"dia": 40, "peso": 2000}]], 21, 35)

    assert resultado == {"ciclos": 0, "error_medio_pct": None, "cobertura_pct": None}
