import numpy as np


VERSION_MODELO = "1.1.0"


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
    confianza = round(max(0.0, min(1.0, r2)), 4)
    return modelo, confianza


def _metadata(nombre, objetivo, confianza, puntos):
    return {
        "nombre": nombre,
        "version": VERSION_MODELO,
        "framework": "numpy",
        "tipo": "regresion_polinomial",
        "objetivo": objetivo,
        "confianza": confianza,
        "puntos_usados": puntos,
    }


def predecir(pesajes, dia_faena, peso_objetivo_g):
    modelo, confianza = _ajustar(pesajes, "peso")
    peso_a_faena = max(0.0, float(modelo(dia_faena)))

    dias_al_objetivo = None
    for d in range(1, 60):
        if modelo(d) >= peso_objetivo_g:
            dias_al_objetivo = d
            break

    return {
        "peso_proyectado_faena_g": round(peso_a_faena),
        "dia_faena": dia_faena,
        "dias_al_objetivo": dias_al_objetivo,
        "peso_objetivo_g": peso_objetivo_g,
        "modelo": _metadata(
            "crecimiento_aves",
            "peso_faena",
            confianza,
            len(pesajes),
        ),
    }


def predecir_mortalidad(mortalidades, dia_faena):
    modelo, confianza = _ajustar(mortalidades, "mortalidad_pct")
    proyectada = float(modelo(dia_faena))

    proyectada = max(0.0, min(100.0, proyectada))
    return {
        "mortalidad_proyectada_pct": round(proyectada, 2),
        "dia_faena": dia_faena,
        "modelo": _metadata(
            "mortalidad_aves",
            "mortalidad",
            confianza,
            len(mortalidades),
        ),
    }


def predecir_consumo(consumos, dia_faena):
    modelo, confianza = _ajustar(consumos, "consumo_acum_kg")
    proyectado = float(modelo(dia_faena))
    proyectado = max(0.0, proyectado)

    return {
        "consumo_proyectado_kg": round(proyectado, 2),
        "dia_faena": dia_faena,
        "modelo": _metadata(
            "consumo_aves",
            "consumo",
            confianza,
            len(consumos),
        ),
    }
