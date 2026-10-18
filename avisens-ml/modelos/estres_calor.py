import math

VERSION_MODELO = "1.0.0"

UMBRALES = (
    ("emergencia", 38.0),
    ("peligro", 37.0),
    ("alerta", 34.0),
    ("atencion", 30.0),
)
AJUSTE_POLLITOS = 3.0
DIA_POLLITO = 14


def bulbo_humedo(temperatura, humedad):
    t, rh = temperatura, max(1.0, min(100.0, humedad))
    return (
        t * math.atan(0.151977 * math.sqrt(rh + 8.313659))
        + math.atan(t + rh)
        - math.atan(rh - 1.676331)
        + 0.00391838 * rh**1.5 * math.atan(0.023101 * rh)
        - 4.686035
    )


def indice_thi(temperatura, humedad):
    return 0.85 * temperatura + 0.15 * bulbo_humedo(temperatura, humedad)


def nivel_de(thi, dia_vida=None):
    ajuste = AJUSTE_POLLITOS if dia_vida is not None and dia_vida < DIA_POLLITO else 0.0
    for nivel, umbral in UMBRALES:
        if thi >= umbral + ajuste:
            return nivel
    return "confort"


LIMITE_AJUSTE_TEMPERATURA = (-5.0, 10.0)
LIMITE_AJUSTE_HUMEDAD = (-30.0, 30.0)
ORDEN = ["confort", "atencion", "alerta", "peligro", "emergencia"]

RECOMENDACIONES = {
    "confort": ["Mantén la ventilación habitual y el agua fresca disponible."],
    "atencion": [
        "Abre cortinas y aumenta la ventilación antes del mediodía.",
        "Revisa que los bebederos tengan agua fresca y suficiente.",
    ],
    "alerta": [
        "Enciende ventiladores y, si tienes, nebulizadores en las horas de calor.",
        "Retira el alimento 4 a 6 horas antes del pico y devuélvelo al bajar el calor.",
        "Agrega electrolitos o vitamina C al agua.",
    ],
    "peligro": [
        "Ventilación máxima y nebulización en las horas señaladas.",
        "Retira el alimento antes del pico y evita mover o pesar las aves.",
        "Recorre el galpón cada hora para detectar aves jadeando o postradas.",
    ],
    "emergencia": [
        "Riesgo alto de mortalidad: ventilación y nebulización al máximo en el pico.",
        "Baja la densidad si es posible y moja el techo para enfriarlo.",
        "Ten a mano el registro de mortalidad para reportar de inmediato.",
    ],
}


def _limitar(valor, limites):
    return max(limites[0], min(limites[1], valor))


def proyectar_riesgo(horas, ajuste_temperatura=0.0, ajuste_humedad=0.0, dia_vida=None):
    delta_t = _limitar(ajuste_temperatura, LIMITE_AJUSTE_TEMPERATURA)
    delta_h = _limitar(ajuste_humedad, LIMITE_AJUSTE_HUMEDAD)
    serie = []
    for hora in horas:
        temperatura = hora["temperatura"] + delta_t
        humedad = max(5.0, min(100.0, hora["humedad"] + delta_h))
        thi = indice_thi(temperatura, humedad)
        serie.append(
            {
                "hora": hora["hora"],
                "temperatura": round(temperatura, 1),
                "humedad": round(humedad),
                "thi": round(thi, 1),
                "nivel": nivel_de(thi, dia_vida),
            }
        )

    pico = max(serie, key=lambda punto: punto["thi"])
    horas_por_nivel = {nivel: 0 for nivel in ORDEN}
    for punto in serie:
        horas_por_nivel[punto["nivel"]] += 1
    primera = next(
        (p for p in serie if ORDEN.index(p["nivel"]) >= ORDEN.index("alerta")),
        None,
    )

    return {
        "serie": serie,
        "pico": pico,
        "nivel_maximo": pico["nivel"],
        "horas_por_nivel": horas_por_nivel,
        "primera_alerta": primera["hora"] if primera else None,
        "ajuste_aplicado": {
            "temperatura": round(delta_t, 1),
            "humedad": round(delta_h),
        },
        "recomendaciones": RECOMENDACIONES[pico["nivel"]],
        "modelo": {
            "nombre": "estres_calor_thi",
            "version": VERSION_MODELO,
            "framework": "python",
            "tipo": "indice_thi_tao_xin_2003",
            "objetivo": "riesgo_calor",
            "confianza": 0.8 if delta_t != 0 else 0.6,
            "puntos_usados": len(serie),
        },
    }
