import pytest

from modelos.estres_calor import (
    bulbo_humedo,
    indice_thi,
    nivel_de,
    proyectar_riesgo,
)


def hora(h, temperatura, humedad=70):
    return {
        "hora": f"2026-10-18T{h:02d}:00",
        "temperatura": temperatura,
        "humedad": humedad,
    }


def test_bulbo_humedo_coincide_con_la_formula_de_stull():
    assert bulbo_humedo(20, 50) == pytest.approx(13.7, abs=0.05)


def test_bulbo_humedo_tolera_humedades_fuera_de_rango():
    assert bulbo_humedo(30, 120) == bulbo_humedo(30, 100)
    assert bulbo_humedo(30, -5) == bulbo_humedo(30, 1)


def test_con_aire_saturado_el_bulbo_humedo_se_acerca_a_la_temperatura():
    assert bulbo_humedo(30, 100) == pytest.approx(30, abs=0.5)


def test_thi_pesa_85_por_ciento_la_temperatura_y_15_el_bulbo_humedo():
    esperado = 0.85 * 35 + 0.15 * bulbo_humedo(35, 60)
    assert indice_thi(35, 60) == pytest.approx(esperado)


@pytest.mark.parametrize(
    ("thi", "nivel"),
    [
        (29.9, "confort"),
        (30, "atencion"),
        (34, "alerta"),
        (37, "peligro"),
        (38, "emergencia"),
    ],
)
def test_niveles_de_tao_y_xin_para_lotes_grandes(thi, nivel):
    assert nivel_de(thi, 30) == nivel


def test_los_pollitos_toleran_tres_puntos_mas():
    assert nivel_de(34, 7) == "atencion"
    assert nivel_de(37, 7) == "alerta"
    assert nivel_de(34, None) == "alerta"


def test_proyeccion_ajusta_al_interior_del_galpon_y_encuentra_el_pico():
    r = proyectar_riesgo(
        [hora(9, 26), hora(12, 30), hora(14, 33), hora(16, 31), hora(20, 25)],
        ajuste_temperatura=2.5,
        dia_vida=30,
    )

    assert r["pico"]["hora"] == "2026-10-18T14:00"
    assert r["pico"]["temperatura"] == 35.5
    assert r["nivel_maximo"] == "alerta"
    assert r["primera_alerta"] == "2026-10-18T14:00"
    assert r["horas_por_nivel"]["alerta"] == 1
    assert sum(r["horas_por_nivel"].values()) == 5
    assert r["recomendaciones"][0].startswith("Enciende ventiladores")
    assert r["modelo"]["confianza"] == 0.8


def test_sin_calor_no_hay_primera_alerta_y_la_confianza_baja_sin_ajuste():
    r = proyectar_riesgo([hora(6, 20), hora(12, 24)], dia_vida=30)

    assert r["nivel_maximo"] == "confort"
    assert r["primera_alerta"] is None
    assert r["modelo"]["confianza"] == 0.6


def test_un_sensor_danado_no_dispara_el_ajuste():
    r = proyectar_riesgo([hora(12, 25)], ajuste_temperatura=40, ajuste_humedad=-90)

    assert r["ajuste_aplicado"] == {"temperatura": 10.0, "humedad": -30}
    assert r["serie"][0]["temperatura"] == 35.0
    assert r["serie"][0]["humedad"] == 40
