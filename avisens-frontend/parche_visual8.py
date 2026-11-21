#!/usr/bin/env python3
"""parche_visual8.py - ejecutar desde avisens-frontend.

1) Deja UNA sola lámpara (la de la entrada) y quita las otras 4.
2) Montañas más altas, más cercanas y con más contraste.
3) Imprime las líneas de niebla/cámara (solo lectura) para ver si algo las oculta.
Respaldo: MapaTermicoGalpon.tsx.bak-visual8
"""
import re
import shutil
import sys

F = "src/features/granjas/propietario/pestanas/ambiente/MapaTermicoGalpon.tsx"

with open(F, encoding="utf-8") as fh:
    src = fh.read()

shutil.copy(F, F + ".bak-visual8")
errores = []


def reemplazar(viejo, nuevo, etiqueta):
    global src
    if src.count(viejo) != 1:
        errores.append(f"[!] No encontré (o hay varias) ancla única: {etiqueta}")
        return
    src = src.replace(viejo, nuevo)
    print(f"[ok] {etiqueta}")


# ---------- 1) Una sola lámpara ----------
if "poste(3.4, 19, true);" not in src:
    errores.append("[!] No encontré poste(3.4, 19, true); (la lámpara que se conserva)")
else:
    for lit in (
        "poste(-3.4, 27, true);",
        "poste(3.4, 35, false);",
        "poste(9.5, 8, true);",
        "poste(-9.5, -10, true);",
    ):
        patron = re.compile(r"[ \t]*" + re.escape(lit) + r"[ \t]*\r?\n")
        src, n = patron.subn("", src)
        print(f"[ok] quitada {lit}" if n else f"[!] no estaba {lit}")

# ---------- 2) Montañas ----------
reemplazar("[125, 55, 30, 1.3, 0.0],", "[95, 45, 40, 1.3, 0.0],", "cordillera 1 (cercana)")
reemplazar("[190, 80, 52, 4.1, 0.3],", "[150, 70, 66, 4.1, 0.18],", "cordillera 2 (media)")
reemplazar("[270, 110, 78, 7.7, 0.55],", "[220, 95, 96, 7.7, 0.35],", "cordillera 3 (lejana)")

reemplazar("const cBase = new THREE.Color(0x2e5a3a);", "const cBase = new THREE.Color(0x2f6f3c);", "color base")
reemplazar("const cMedia = new THREE.Color(0x4f7d4d);", "const cMedia = new THREE.Color(0x68a357);", "color medio")
reemplazar("const cAlta = new THREE.Color(0x9aaeb0);", "const cAlta = new THREE.Color(0xc3ccc4);", "color cumbre")
reemplazar("const cFria = new THREE.Color(0x9db3c2);", "const cFria = new THREE.Color(0x8fb0c8);", "color frío")
reemplazar(
    "const h = hMax * (0.35 + 0.65 * cresta);",
    "const h = hMax * (0.5 + 0.5 * cresta);",
    "altura mínima mayor (sin tramos planos)",
)

if errores:
    print("\n".join(errores))
    print("\nNo se escribió nada. Restaura con el .bak-visual8 si hace falta.")
    sys.exit(1)

with open(F, "w", encoding="utf-8") as fh:
    fh.write(src)

# ---------- 3) Diagnóstico (solo lectura) ----------
print("\n--- Niebla / cámara / fondo (pégame esto) ---")
clave = re.compile(r"[Ff]og|\bfar\b|far:|PerspectiveCamera|maxDistance|scene\.background")
for i, linea in enumerate(src.splitlines(), 1):
    if clave.search(linea):
        print(f"{i}: {linea.strip()[:140]}")

print("\nListo. Ahora: npx tsc --noEmit && docker cp src/. avisens-frontend:/app/src/")
