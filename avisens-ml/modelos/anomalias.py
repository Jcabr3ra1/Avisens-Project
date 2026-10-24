from itertools import pairwise

import numpy as np

VERSION_MODELO = "1.0.0"
ORDEN_SEVERIDAD = ["alta", "media", "baja"]

GANANCIA_LENTA = 0.5
CAIDA_CONSUMO_MEDIA = 0.7
CAIDA_CONSUMO_ALTA = 0.5
BAJO_CURVA_MEDIA = 0.15
BAJO_CURVA_ALTA = 0.25
SOBRE_CURVA_DATO_SOSPECHOSO = 0.3
PICO_MORTALIDAD_MULTIPLO = 3.0
PICO_MORTALIDAD_MINIMO_PP_DIA = 0.15
PICO_MORTALIDAD_ALTA = 2.0
OBSERVACIONES_PREVIAS_MINIMAS = 2


def _ordenar(serie):
    return sorted(serie, key=lambda p: p["dia"])


def _tasas(serie, campo):
    tasas = []
    for anterior, actual in pairwise(serie):
        dias = actual["dia"] - anterior["dia"]
        tasas.append((actual["dia"], (actual[campo] - anterior[campo]) / dias))
    return tasas


def _mediana_previa(tasas, posicion):
    previas = [t for _, t in tasas[:posicion]]
    if len(previas) < OBSERVACIONES_PREVIAS_MINIMAS:
        return None
    return float(np.median(previas))


def _alerta(tipo, severidad, dia, mensaje, valor=None):
    alerta = {"tipo": tipo, "severidad": severidad, "dia": dia, "mensaje": mensaje}
    if valor is not None:
        alerta["valor"] = valor
    return alerta


def _anomalias_de_peso(pesajes, curva_referencia):
    serie = _ordenar(pesajes)
    alertas = []
    tasas = _tasas(serie, "peso")
    for posicion, (dia, ganancia) in enumerate(tasas):
        anterior = serie[posicion]
        actual = serie[posicion + 1]
        if actual["peso"] < anterior["peso"]:
            alertas.append(
                _alerta(
                    "peso_descendente",
                    "alta",
                    dia,
                    f"El peso bajó de {round(anterior['peso'])} g (día {anterior['dia']}) "
                    f"a {round(actual['peso'])} g (día {dia}). Revisa la balanza o la muestra.",
                    round(actual["peso"]),
                )
            )
            continue
        mediana = _mediana_previa(tasas, posicion)
        if mediana and mediana > 0 and ganancia < GANANCIA_LENTA * mediana:
            alertas.append(
                _alerta(
                    "ganancia_lenta",
                    "media",
                    dia,
                    f"La ganancia diaria bajó a {round(ganancia)} g/día "
                    f"cuando venía en {round(mediana)} g/día.",
                    round(ganancia),
                )
            )

    referencia = {p["dia"]: p["peso"] for p in curva_referencia}
    for punto in serie:
        esperado = referencia.get(punto["dia"])
        if not esperado:
            continue
        desviacion = (punto["peso"] - esperado) / esperado
        if desviacion <= -BAJO_CURVA_MEDIA:
            severidad = "alta" if desviacion <= -BAJO_CURVA_ALTA else "media"
            alertas.append(
                _alerta(
                    "bajo_curva",
                    severidad,
                    punto["dia"],
                    f"El peso del día {punto['dia']} ({round(punto['peso'])} g) está "
                    f"{round(-desviacion * 100)} % por debajo de la curva ({round(esperado)} g).",
                    round(punto["peso"]),
                )
            )
        elif desviacion >= SOBRE_CURVA_DATO_SOSPECHOSO:
            alertas.append(
                _alerta(
                    "peso_atipico",
                    "baja",
                    punto["dia"],
                    f"El peso del día {punto['dia']} ({round(punto['peso'])} g) supera "
                    f"{round(desviacion * 100)} % la curva: confirma que el dato sea correcto.",
                    round(punto["peso"]),
                )
            )
    return alertas


def _anomalias_de_consumo(consumos):
    serie = _ordenar(consumos)
    tasas = _tasas(serie, "consumo_acum_kg")
    alertas = []
    for posicion, (dia, tasa) in enumerate(tasas):
        if tasa < 0:
            alertas.append(
                _alerta(
                    "consumo_inconsistente",
                    "alta",
                    dia,
                    "El consumo acumulado del día "
                    f"{dia} es menor que el anterior: revisa el registro.",
                )
            )
            continue
        mediana = _mediana_previa(tasas, posicion)
        if not mediana or mediana <= 0:
            continue
        if tasa < CAIDA_CONSUMO_MEDIA * mediana:
            severidad = "alta" if tasa < CAIDA_CONSUMO_ALTA * mediana else "media"
            alertas.append(
                _alerta(
                    "caida_consumo",
                    severidad,
                    dia,
                    f"El consumo bajó a {round(tasa, 1)} kg/día cuando venía en "
                    f"{round(mediana, 1)} kg/día. Puede ser el primer signo de un problema.",
                    round(tasa, 1),
                )
            )
    return alertas


def _anomalias_de_mortalidad(mortalidades):
    serie = _ordenar(mortalidades)
    tasas = _tasas(serie, "mortalidad_pct")
    alertas = []
    for posicion, (dia, tasa) in enumerate(tasas):
        if tasa < 0:
            alertas.append(
                _alerta(
                    "mortalidad_inconsistente",
                    "alta",
                    dia,
                    "La mortalidad acumulada del día "
                    f"{dia} es menor que la anterior: revisa el registro.",
                )
            )
            continue
        mediana = _mediana_previa(tasas, posicion) or 0.0
        limite = max(PICO_MORTALIDAD_MINIMO_PP_DIA, PICO_MORTALIDAD_MULTIPLO * mediana)
        if tasa > limite:
            severidad = "alta" if tasa > PICO_MORTALIDAD_ALTA * limite else "media"
            alertas.append(
                _alerta(
                    "pico_mortalidad",
                    severidad,
                    dia,
                    f"La mortalidad subió {round(tasa, 2)} puntos por día hasta el día "
                    f"{dia}, muy por encima de lo habitual de este lote.",
                    round(tasa, 2),
                )
            )
    return alertas


def detectar(pesajes=None, consumos=None, mortalidades=None, curva_referencia=None):
    alertas = []
    if pesajes:
        alertas += _anomalias_de_peso(pesajes, curva_referencia or [])
    if consumos:
        alertas += _anomalias_de_consumo(consumos)
    if mortalidades:
        alertas += _anomalias_de_mortalidad(mortalidades)
    alertas.sort(key=lambda a: (ORDEN_SEVERIDAD.index(a["severidad"]), a["dia"]))
    severidad_maxima = alertas[0]["severidad"] if alertas else "ninguna"
    return {
        "anomalias": alertas,
        "resumen": {"total": len(alertas), "severidad_maxima": severidad_maxima},
        "modelo": {
            "nombre": "anomalias_lote",
            "version": VERSION_MODELO,
            "framework": "numpy",
            "tipo": "reglas_y_estadistica_robusta",
            "objetivo": "alertas_tempranas",
        },
    }
