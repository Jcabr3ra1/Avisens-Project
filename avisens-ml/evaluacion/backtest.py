import json
import sys

from modelos.polinomial import predecir

PUNTOS_MINIMOS = 3
PESO_OBJETIVO_NEUTRO_G = 10000


def retrospectiva(ciclos, dia_corte, dia_objetivo):
    errores = []
    dentro = 0
    for pesajes in ciclos:
        pasados = [p for p in pesajes if p["dia"] <= dia_corte]
        real = next((p["peso"] for p in pesajes if p["dia"] == dia_objetivo), None)
        if len(pasados) < PUNTOS_MINIMOS or real is None:
            continue
        prediccion = predecir(pasados, dia_objetivo, PESO_OBJETIVO_NEUTRO_G)
        proyectado = prediccion["peso_proyectado_faena_g"]
        rango = prediccion["rango"]
        errores.append(abs(proyectado - real) / real)
        dentro += rango["min"] <= real <= rango["max"]
    if not errores:
        return {"ciclos": 0, "error_medio_pct": None, "cobertura_pct": None}
    return {
        "ciclos": len(errores),
        "error_medio_pct": round(100 * sum(errores) / len(errores), 2),
        "cobertura_pct": round(100 * dentro / len(errores), 1),
    }


if __name__ == "__main__":
    with open(sys.argv[1]) as archivo:
        ciclos = json.load(archivo)
    print(
        json.dumps(retrospectiva(ciclos, int(sys.argv[2]), int(sys.argv[3])), indent=2)
    )
