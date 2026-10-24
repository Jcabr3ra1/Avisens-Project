import numpy as np
import pytest

from modelos.gompertz import (
    PARAMETROS_POR_DEFECTO,
    ajustar,
    dia_para_peso,
    gompertz,
    jacobiano,
    parametros_de_referencia,
    proyectar_crecimiento,
)

ROSS_308_MIXTO = [
    {"dia": d, "peso": p}
    for d, p in [
        (1, 62),
        (7, 213),
        (14, 533),
        (21, 1012),
        (28, 1616),
        (35, 2296),
        (42, 2998),
        (49, 3681),
        (56, 4318),
    ]
]


def pesajes_del_estandar(factor, hasta_dia):
    return [
        {"dia": p["dia"], "peso": p["peso"] * factor}
        for p in ROSS_308_MIXTO
        if 1 < p["dia"] <= hasta_dia
    ]


def test_parametros_por_defecto_dan_un_pollo_de_engorde_tipico():
    pesos = gompertz(np.array([0.0, 42.0]), np.log(PARAMETROS_POR_DEFECTO))

    assert pesos[0] == pytest.approx(45, abs=1)
    assert pesos[1] == pytest.approx(3130, abs=1)


def test_jacobiano_coincide_con_la_derivada_numerica():
    dias = np.array([7.0, 21.0, 35.0])
    theta = np.log(PARAMETROS_POR_DEFECTO)
    h = 1e-6
    numerico = np.column_stack(
        [
            (gompertz(dias, theta + h * e) - gompertz(dias, theta - h * e)) / (2 * h)
            for e in np.eye(3)
        ]
    )

    np.testing.assert_allclose(jacobiano(dias, theta), numerico, rtol=1e-5)


def test_ajuste_sin_ancla_recupera_los_parametros_de_una_curva_exacta():
    real = np.log([5000.0, 4.6, 0.05])
    dias = np.arange(1, 50, 3, dtype=float)
    pesos = gompertz(dias, real)

    theta, _ = ajustar(dias, pesos, pesos * 0.03, np.log(PARAMETROS_POR_DEFECTO))

    np.testing.assert_allclose(np.exp(theta), np.exp(real), rtol=1e-4)


def test_referencia_usa_los_valores_por_defecto_sin_curva_suficiente():
    esperado = np.log(PARAMETROS_POR_DEFECTO)

    np.testing.assert_allclose(parametros_de_referencia(None), esperado)
    np.testing.assert_allclose(parametros_de_referencia(ROSS_308_MIXTO[:2]), esperado)


def test_referencia_reproduce_la_curva_genetica():
    theta = parametros_de_referencia(ROSS_308_MIXTO)

    assert gompertz(np.array([42.0]), theta)[0] == pytest.approx(2998, rel=0.03)


def test_dia_para_peso_es_la_inversa_de_gompertz():
    theta = np.log(PARAMETROS_POR_DEFECTO)
    peso_dia_30 = gompertz(np.array([30.0]), theta)[0]

    assert dia_para_peso(peso_dia_30, theta) == pytest.approx(30)
    assert dia_para_peso(PARAMETROS_POR_DEFECTO[0], theta) is None


def test_lote_en_el_estandar_proyecta_cerca_de_la_curva_genetica():
    r = proyectar_crecimiento(pesajes_del_estandar(1.0, 21), 42, ROSS_308_MIXTO)

    assert r["peso_final_g"] == pytest.approx(2998, rel=0.03)


def test_lote_atrasado_o_adelantado_se_proyecta_por_debajo_o_por_encima():
    atrasado = proyectar_crecimiento(pesajes_del_estandar(0.9, 21), 42, ROSS_308_MIXTO)
    normal = proyectar_crecimiento(pesajes_del_estandar(1.0, 21), 42, ROSS_308_MIXTO)
    adelantado = proyectar_crecimiento(
        pesajes_del_estandar(1.1, 21), 42, ROSS_308_MIXTO
    )

    assert (
        atrasado["peso_final_g"] < normal["peso_final_g"] < adelantado["peso_final_g"]
    )


def test_la_banda_se_angosta_con_mas_pesajes():
    uno = proyectar_crecimiento(pesajes_del_estandar(1.0, 7), 42, ROSS_308_MIXTO)
    cinco = proyectar_crecimiento(pesajes_del_estandar(1.0, 35), 42, ROSS_308_MIXTO)

    ancho_uno = uno["serie"][-1]["max_g"] - uno["serie"][-1]["min_g"]
    ancho_cinco = cinco["serie"][-1]["max_g"] - cinco["serie"][-1]["min_g"]
    assert ancho_cinco < ancho_uno
    assert cinco["modelo"]["confianza"] > uno["modelo"]["confianza"]


def test_la_serie_cubre_cada_dia_y_la_banda_contiene_la_proyeccion():
    r = proyectar_crecimiento(pesajes_del_estandar(1.0, 21), 42, ROSS_308_MIXTO)

    assert [p["dia"] for p in r["serie"]] == list(range(1, 43))
    assert all(p["min_g"] <= p["peso_g"] <= p["max_g"] for p in r["serie"])
    assert r["serie"][-1]["peso_g"] == r["peso_final_g"]


def test_la_banda_se_ensancha_hacia_la_faena():
    r = proyectar_crecimiento(pesajes_del_estandar(1.0, 21), 42, ROSS_308_MIXTO)

    ancho = [(p["max_g"] - p["min_g"]) / p["peso_g"] for p in r["serie"]]
    assert ancho[41] > ancho[20]


def test_un_solo_pesaje_alcanza_para_proyectar():
    r = proyectar_crecimiento([{"dia": 10, "peso": 330}], 42, ROSS_308_MIXTO)

    assert r["modelo"]["puntos_usados"] == 1
    assert 0 < r["modelo"]["confianza"] < 1


def test_llegada_al_objetivo_y_objetivo_inalcanzable():
    r = proyectar_crecimiento(pesajes_del_estandar(1.0, 21), 42, ROSS_308_MIXTO, 2500)
    inalcanzable = proyectar_crecimiento(
        pesajes_del_estandar(1.0, 21), 42, ROSS_308_MIXTO, 99999
    )

    assert 35 < r["dia_al_objetivo"] < 42
    assert inalcanzable["dia_al_objetivo"] is None


def test_punto_de_inflexion_y_trazabilidad_del_modelo():
    r = proyectar_crecimiento(pesajes_del_estandar(1.0, 21), 42, ROSS_308_MIXTO)

    assert 25 < r["punto_inflexion"]["dia"] < 40
    assert r["punto_inflexion"]["peso_g"] == round(
        r["parametros"]["peso_maximo_g"] / np.e
    )
    assert r["modelo"]["nombre"] == "crecimiento_gompertz"
    assert r["modelo"]["version"] == "2.0.0"
    assert r["modelo"]["puntos_usados"] == 3
