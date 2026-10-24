import numpy as np

VERSION_MODELO = "1.2.0"
PESO_MAXIMO_G = 10000.0
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
    return modelo, confianza


def _ultima_observacion(serie, campo):
    ultima = max(serie, key=lambda p: p["dia"])
    return ultima["dia"], float(ultima[campo])


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
    _, ultima = _ultima_observacion(mortalidades, "mortalidad_pct")
    proyectada = max(ultima, float(modelo(dia_faena)))
    proyectada = min(100.0, proyectada)
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
    _, ultimo = _ultima_observacion(consumos, "consumo_acum_kg")
    proyectado = max(ultimo, float(modelo(dia_faena)))

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
