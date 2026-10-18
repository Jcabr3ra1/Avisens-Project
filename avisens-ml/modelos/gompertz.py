import numpy as np

PARAMETROS_POR_DEFECTO = (5500.0, 4.8, 0.051)


def gompertz(dias, theta):
    a, b, k = np.exp(theta)
    return a * np.exp(-b * np.exp(-k * dias))


def jacobiano(dias, theta):
    a, b, k = np.exp(theta)
    decaimiento = np.exp(-k * dias)
    peso = a * np.exp(-b * decaimiento)
    return np.column_stack(
        [peso, -peso * b * decaimiento, peso * b * k * dias * decaimiento]
    )


ESCALA_PRIOR = np.array([0.15, 0.08, 0.08])
ERROR_RELATIVO_PESAJE = 0.06
ERROR_RELATIVO_CURVA = 0.03


def ajustar(dias, pesos, sigmas, theta_inicial, prior=None, iteraciones=100):
    theta = np.array(theta_inicial, dtype=float)
    amortiguacion = 1e-3

    def residuos(t):
        r = (gompertz(dias, t) - pesos) / sigmas
        if prior is None:
            return r
        return np.concatenate([r, (t - prior) / ESCALA_PRIOR])

    def matriz(t):
        j = jacobiano(dias, t) / sigmas[:, None]
        if prior is None:
            return j
        return np.vstack([j, np.diag(1 / ESCALA_PRIOR)])

    costo = np.sum(residuos(theta) ** 2)
    for _ in range(iteraciones):
        j = matriz(theta)
        normal = j.T @ j
        paso = np.linalg.solve(
            normal + amortiguacion * np.diag(np.diag(normal)),
            -j.T @ residuos(theta),
        )
        candidato = theta + paso
        costo_candidato = np.sum(residuos(candidato) ** 2)
        if costo_candidato < costo:
            theta, costo = candidato, costo_candidato
            amortiguacion /= 3
            if np.max(np.abs(paso)) < 1e-8:
                break
        else:
            amortiguacion *= 3

    j = matriz(theta)
    return theta, j.T @ j


def parametros_de_referencia(curva):
    if not curva or len(curva) < 3:
        return np.log(PARAMETROS_POR_DEFECTO)
    dias = np.array([p["dia"] for p in curva], dtype=float)
    pesos = np.array([p["peso"] for p in curva], dtype=float)
    theta, _ = ajustar(
        dias, pesos, pesos * ERROR_RELATIVO_CURVA, np.log(PARAMETROS_POR_DEFECTO)
    )
    return theta


Z_90 = 1.645
ERROR_PROCESO = 0.03
VERSION_MODELO = "2.0.0"


def dia_para_peso(peso, theta):
    a, b, k = np.exp(theta)
    if peso >= a:
        return None
    return max(0.0, float(-np.log(np.log(a / peso) / b) / k))


def proyectar_crecimiento(
    pesajes, dia_final, curva_referencia=None, peso_objetivo_g=None
):
    prior = parametros_de_referencia(curva_referencia)
    dias = np.array([p["dia"] for p in pesajes], dtype=float)
    pesos = np.array([p["peso"] for p in pesajes], dtype=float)
    sigmas = pesos * ERROR_RELATIVO_PESAJE
    theta, normal = ajustar(dias, pesos, sigmas, prior, prior=prior)

    errores = (gompertz(dias, theta) - pesos) / sigmas
    escala = max(1.0, float(np.mean(errores**2)))
    covarianza = np.linalg.inv(normal) * escala

    eje = np.arange(1, dia_final + 1, dtype=float)
    curva = gompertz(eje, theta)
    g = jacobiano(eje, theta)
    varianza = np.einsum("ij,jk,ik->i", g, covarianza, g)
    margen = Z_90 * np.sqrt(varianza + (curva * ERROR_PROCESO) ** 2)

    a, b, k = np.exp(theta)
    llegada = dia_para_peso(peso_objetivo_g, theta) if peso_objetivo_g else None

    return {
        "serie": [
            {
                "dia": int(dia),
                "peso_g": round(float(peso)),
                "min_g": round(float(max(peso - m, 0.0))),
                "max_g": round(float(peso + m)),
            }
            for dia, peso, m in zip(eje, curva, margen)
        ],
        "dia_final": dia_final,
        "peso_final_g": round(float(curva[-1])),
        "dia_al_objetivo": None if llegada is None else round(llegada, 1),
        "parametros": {
            "peso_maximo_g": round(float(a)),
            "b": round(float(b), 4),
            "k": round(float(k), 4),
        },
        "punto_inflexion": {
            "dia": round(float(np.log(b) / k), 1),
            "peso_g": round(float(a / np.e)),
            "ganancia_max_g_dia": round(float(k * a / np.e), 1),
        },
        "modelo": {
            "nombre": "crecimiento_gompertz",
            "version": VERSION_MODELO,
            "framework": "numpy",
            "tipo": "gompertz_anclado_a_curva_genetica",
            "objetivo": "curva_crecimiento",
            "confianza": round(max(0.0, 1 - float(margen[-1] / curva[-1])), 4),
            "puntos_usados": len(pesajes),
        },
    }
