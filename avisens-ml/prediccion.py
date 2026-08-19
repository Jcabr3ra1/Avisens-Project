import numpy as np


def predecir(pesajes, dia_faena, peso_objetivo_g):
    dias = np.array([p["dia"] for p in pesajes])
    pesos = np.array([p["peso"] for p in pesajes])

    coeficientes = np.polyfit(dias, pesos, 2)
    modelo = np.poly1d(coeficientes)

    peso_a_faena = float(modelo(dia_faena))

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
    }


def predecir_mortalidad(mortalidades, dia_faena):
    dias = np.array([m["dia"] for m in mortalidades])
    pct = np.array([m["mortalidad_pct"] for m in mortalidades])

    coeficientes = np.polyfit(dias, pct, 2)
    modelo = np.poly1d(coeficientes)
    proyectada = float(modelo(dia_faena))


    proyectada = max(0.0, min(100.0, proyectada))
    return {
        "mortalidad_proyectada_pct": round(proyectada, 2),
        "dia_faena": dia_faena,
    }
