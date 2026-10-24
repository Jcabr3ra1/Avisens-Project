import numpy as np

from modelos.confianza import COBERTURA_PCT as COBERTURA_PESO_PCT
from modelos.confianza import (
    ampliar_rango_por_calor,
    factores_de_calor,
    margen_de_prediccion,
    motivo_de_calor,
    motivos_de,
    nivel_con_calor,
    nivel_de_confianza,
    rango_de,
)

VERSION_MODELO = "1.2.0"
PESO_MAXIMO_G = 10000.0
MORTALIDAD_MAXIMA_PCT = 100.0
CONSUMO_MAXIMO_KG = 1_000_000.0
PUNTOS_PARA_PROYECCION_FIRME = 8
PUNTOS_PARA_CONFIANZA_PLENA = 10
DIA_MAXIMO_OBJETIVO = 60


def _ajustar(serie, campo):
    dias = np.asarray([p["dia"] for p in serie], dtype=float)
    valores = np.asarray([p[campo] for p in serie], dtype=float)

    if len(serie) < 3:
        raise ValueError("Se requieren al menos 3 observaciones")
    if len(set(dias.tolist())) != len(dias):
        raise ValueError("Cada observacion debe pertenecer a un dia distinto")
    if not np.isfinite(dias).all() or not np.isfinite(valores).all():
        raise ValueError("Las observaciones deben contener valores finitos")

    coeficientes = np.polyfit(dias, valores, 2)
    modelo = np.poly1d(coeficientes)
    ajustados = modelo(dias)
    suma_residuos = float(np.sum((valores - ajustados) ** 2))
    suma_total = float(np.sum((valores - np.mean(valores)) ** 2))
    r2 = 0.0 if suma_total == 0 else 1 - suma_residuos / suma_total
    ajuste = max(0.0, min(1.0, r2))
    respaldo = min(1.0, len(serie) / PUNTOS_PARA_CONFIANZA_PLENA)
    confianza = round(ajuste * respaldo, 4)
    return {
        "modelo": modelo,
        "confianza": confianza,
        "r2": r2,
        "dias": dias,
        "valores": valores,
        "ultimo_dia": int(dias.max()),
    }


def _ultima_observacion(serie, campo):
    ultima = max(serie, key=lambda p: p["dia"])
    return ultima["dia"], float(ultima[campo])


def _horizonte(ajuste, dia_faena):
    return max(0, dia_faena - ajuste["ultimo_dia"])


def _margen(ajuste, dia_faena, valor):
    return margen_de_prediccion(
        ajuste["dias"],
        ajuste["valores"],
        ajuste["modelo"],
        dia_faena,
        valor,
        _horizonte(ajuste, dia_faena),
    )


def _metadata(nombre, objetivo, ajuste, puntos, dia_faena):
    confianza = ajuste["confianza"]
    return {
        "nombre": nombre,
        "version": VERSION_MODELO,
        "framework": "numpy",
        "tipo": "regresion_polinomial",
        "objetivo": objetivo,
        "confianza": confianza,
        "nivel_confianza": nivel_de_confianza(confianza),
        "motivos": motivos_de(
            puntos,
            PUNTOS_PARA_PROYECCION_FIRME,
            _horizonte(ajuste, dia_faena),
            ajuste["r2"],
        ),
        "puntos_usados": puntos,
    }


def predecir(pesajes, dia_faena, peso_objetivo_g, horas_calor_severo=0):
    ajuste = _ajustar(pesajes, "peso")
    modelo = ajuste["modelo"]
    ultimo_dia, ultimo_peso = _ultima_observacion(pesajes, "peso")
    peso_a_faena = min(PESO_MAXIMO_G, max(ultimo_peso, float(modelo(dia_faena))))

    dias_al_objetivo = None
    if ultimo_peso >= peso_objetivo_g:
        dias_al_objetivo = ultimo_dia
    else:
        for d in range(ultimo_dia + 1, DIA_MAXIMO_OBJETIVO):
            if modelo(d) >= peso_objetivo_g:
                dias_al_objetivo = d
                break

    margen = _margen(ajuste, dia_faena, peso_a_faena)
    rango = rango_de(
        peso_a_faena, margen, ultimo_peso, PESO_MAXIMO_G, 0, COBERTURA_PESO_PCT
    )
    metadata = _metadata(
        "crecimiento_aves", "peso_faena", ajuste, len(pesajes), dia_faena
    )
    motivo_calor = motivo_de_calor(horas_calor_severo)
    if motivo_calor:
        metadata["motivos"].append(motivo_calor)
        metadata["nivel_confianza"] = nivel_con_calor(
            metadata["nivel_confianza"], horas_calor_severo
        )
    return {
        "peso_proyectado_faena_g": round(peso_a_faena),
        "dia_faena": dia_faena,
        "dias_al_objetivo": dias_al_objetivo,
        "peso_objetivo_g": peso_objetivo_g,
        "rango": ampliar_rango_por_calor(
            rango, peso_a_faena, horas_calor_severo, ultimo_peso
        ),
        "factores": factores_de_calor(horas_calor_severo),
        "modelo": metadata,
    }


def predecir_mortalidad(mortalidades, dia_faena):
    ajuste = _ajustar(mortalidades, "mortalidad_pct")
    _, ultima = _ultima_observacion(mortalidades, "mortalidad_pct")
    proyectada = min(
        MORTALIDAD_MAXIMA_PCT, max(ultima, float(ajuste["modelo"](dia_faena)))
    )
    margen = _margen(ajuste, dia_faena, proyectada)
    return {
        "mortalidad_proyectada_pct": round(proyectada, 2),
        "dia_faena": dia_faena,
        "rango": rango_de(proyectada, margen, ultima, MORTALIDAD_MAXIMA_PCT, 2),
        "modelo": _metadata(
            "mortalidad_aves", "mortalidad", ajuste, len(mortalidades), dia_faena
        ),
    }


def predecir_consumo(consumos, dia_faena):
    ajuste = _ajustar(consumos, "consumo_acum_kg")
    _, ultimo = _ultima_observacion(consumos, "consumo_acum_kg")
    proyectado = max(ultimo, float(ajuste["modelo"](dia_faena)))
    margen = _margen(ajuste, dia_faena, proyectado)
    return {
        "consumo_proyectado_kg": round(proyectado, 2),
        "dia_faena": dia_faena,
        "rango": rango_de(proyectado, margen, ultimo, CONSUMO_MAXIMO_KG, 2),
        "modelo": _metadata(
            "consumo_aves", "consumo", ajuste, len(consumos), dia_faena
        ),
    }
