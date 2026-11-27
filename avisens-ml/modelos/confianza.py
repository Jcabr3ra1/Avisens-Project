import numpy as np

COBERTURA_PCT = 90
UMBRAL_ALTA = 0.75
UMBRAL_MEDIA = 0.45
HORIZONTE_LEJANO_DIAS = 14
AJUSTE_IRREGULAR = 0.9
MARGEN_MINIMO = 0.12
INFLACION_POR_DIA_DE_HORIZONTE = 0.1
MARGEN_SIN_GRADOS_DE_LIBERTAD = 0.15
MARGEN_POR_DIA_DE_HORIZONTE = 0.012
MARGEN_MAXIMO_SIN_GRADOS = 0.5
T_90 = {1: 6.314, 2: 2.920, 3: 2.353, 4: 2.132, 5: 2.015, 6: 1.943, 7: 1.895}
T_90_INTERMEDIO = 1.8
T_90_MUESTRA_GRANDE = 1.645


def nivel_de_confianza(confianza):
    if confianza >= UMBRAL_ALTA:
        return "alta"
    if confianza >= UMBRAL_MEDIA:
        return "media"
    return "baja"


def motivos_de(puntos, minimo_firme, horizonte, r2=None):
    motivos = []
    if puntos < minimo_firme:
        motivos.append(
            f"Solo {puntos} mediciones: con {minimo_firme} o más la proyección es más firme"
        )
    if r2 is not None and puntos >= 3 and r2 < AJUSTE_IRREGULAR:
        motivos.append("Las mediciones no siguen una tendencia regular")
    if horizonte > HORIZONTE_LEJANO_DIAS:
        motivos.append(
            f"Proyección lejana: faltan {horizonte} días desde la última medición"
        )
    return motivos


def _t_90(grados):
    if grados in T_90:
        return T_90[grados]
    return T_90_INTERMEDIO if grados < 30 else T_90_MUESTRA_GRANDE


def margen_de_prediccion(dias, valores, modelo, dia_objetivo, valor, horizonte):
    piso = MARGEN_MINIMO * abs(valor)
    grados = len(dias) - 3
    inflacion = 1 + INFLACION_POR_DIA_DE_HORIZONTE * horizonte
    if grados < 1:
        relativo = min(
            MARGEN_MAXIMO_SIN_GRADOS,
            MARGEN_SIN_GRADOS_DE_LIBERTAD + MARGEN_POR_DIA_DE_HORIZONTE * horizonte,
        )
        return max(piso, relativo * abs(valor))

    residuos = valores - modelo(dias)
    varianza = float(np.sum(residuos**2)) / grados
    base = np.vander(dias, 3)
    punto = np.vander([float(dia_objetivo)], 3)[0]
    palanca = float(punto @ np.linalg.pinv(base.T @ base) @ punto)
    estadistico = _t_90(grados) * float(np.sqrt(varianza * (1 + palanca)))
    return max(piso, estadistico * inflacion)


def rango_de(valor, margen, minimo, maximo, decimales, cobertura_pct=None):
    redondear = round if decimales else (lambda x, _: round(x))
    rango = {
        "min": redondear(max(minimo, valor - margen), decimales),
        "max": redondear(min(maximo, valor + margen), decimales),
    }
    if cobertura_pct is not None:
        rango["cobertura_pct"] = cobertura_pct
    return rango


HORAS_CALOR_RELEVANTES = 6
HORAS_CALOR_BAJAN_NIVEL = 24
AMPLIACION_POR_HORA_DE_CALOR = 0.001
AMPLIACION_MAXIMA_POR_CALOR = 0.08
NIVELES = ["baja", "media", "alta"]


def factores_de_calor(horas):
    if horas < HORAS_CALOR_RELEVANTES:
        return []
    return [{"factor": "calor_severo", "horas": horas}]


def motivo_de_calor(horas):
    if horas < HORAS_CALOR_RELEVANTES:
        return None
    return (
        f"Calor severo sostenido ({horas} h en los últimos 7 días): "
        "el peso final puede quedar por debajo de lo proyectado"
    )


def ampliar_rango_por_calor(rango, valor, horas, minimo):
    if horas < HORAS_CALOR_RELEVANTES:
        return rango
    ampliacion = min(AMPLIACION_MAXIMA_POR_CALOR, AMPLIACION_POR_HORA_DE_CALOR * horas)
    ampliado = max(minimo, round(rango["min"] - valor * ampliacion))
    return {**rango, "min": min(rango["min"], ampliado)}


def nivel_con_calor(nivel, horas):
    if horas < HORAS_CALOR_BAJAN_NIVEL:
        return nivel
    return NIVELES[max(0, NIVELES.index(nivel) - 1)]
