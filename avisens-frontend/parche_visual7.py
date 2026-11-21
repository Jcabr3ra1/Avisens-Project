#!/usr/bin/env python3
"""Parche 7 (AVISENS) para MapaTermicoGalpon.tsx:
- Cordillera 360° en 3 capas + suelo lejano + neblina FogExp2 sincronizada con la hora
- Postes de madera con lámparas y luces cálidas (solo al atardecer/noche)
- HUD: nombre del galpón (y el lote con sus días como etiqueta)
- Botón de desarrollo "Simular datos" para probar el mapa de calor sin sensores
- Optimización: pausa fuera de pantalla y 30 fps cuando no hay interacción
Uso (desde avisens-frontend):  python3 parche_visual7.py
"""
import re
import shutil
import sys

TSX = "src/features/granjas/propietario/pestanas/ambiente/MapaTermicoGalpon.tsx"

# ----------------------------------------------------------------------
# Funciones nuevas a nivel de módulo (se insertan antes del componente)
# ----------------------------------------------------------------------
FUNCIONES = r'''const FOG_POR_FASE: Record<FaseDelDia, number> = {
  dia: 0xcfe0ea,
  amanecer: 0xf1d3c0,
  tarde: 0xf0d0a8,
  noche: 0x1b2b4d,
};
const NIVEL_LUZ_POSTES: Record<FaseDelDia, number> = { dia: 0, amanecer: 0.25, tarde: 0.55, noche: 1 };

/** Una cadena de montañas en anillo: ladera orgánica con color por altura. */
function crearCordillera(rIn: number, ancho: number, hMax: number, semilla: number, tinte: number) {
  const N = 240;
  const M = 8;
  const pos = new Float32Array((N + 1) * (M + 1) * 3);
  const col = new Float32Array((N + 1) * (M + 1) * 3);
  const cBase = new THREE.Color(0x2e5a3a);
  const cMedia = new THREE.Color(0x4f7d4d);
  const cAlta = new THREE.Color(0x9aaeb0);
  const cFria = new THREE.Color(0x9db3c2);
  const c = new THREE.Color();
  for (let i = 0; i <= N; i++) {
    const th = (i / N) * Math.PI * 2;
    const cresta =
      0.5 +
      0.5 *
        (0.5 * Math.sin(3 * th + semilla) +
          0.3 * Math.sin(7 * th + semilla * 1.7) +
          0.15 * Math.sin(17 * th + semilla * 2.3) +
          0.05 * Math.sin(43 * th + semilla * 3.1));
    const h = hMax * (0.35 + 0.65 * cresta);
    for (let j = 0; j <= M; j++) {
      const t = j / M;
      const perfil = Math.pow(Math.sin(Math.PI * t), 0.85);
      const ruido = 0.88 + 0.12 * Math.sin(th * 29 + t * 7 + semilla) * Math.cos(th * 13 - t * 5);
      const y = -4 + h * perfil * ruido;
      const r = rIn + t * ancho;
      const k = (i * (M + 1) + j) * 3;
      pos[k] = Math.cos(th) * r;
      pos[k + 1] = y;
      pos[k + 2] = Math.sin(th) * r;
      const a = THREE.MathUtils.clamp((y + 4) / hMax, 0, 1);
      if (a < 0.35) c.copy(cBase).lerp(cMedia, a / 0.35);
      else c.copy(cMedia).lerp(cAlta, (a - 0.35) / 0.65);
      c.lerp(cFria, tinte);
      const v = 0.94 + 0.06 * Math.sin(th * 61 + j * 3.1);
      col[k] = c.r * v;
      col[k + 1] = c.g * v;
      col[k + 2] = c.b * v;
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      const a = i * (M + 1) + j;
      const b = (i + 1) * (M + 1) + j;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const malla = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide,
    }),
  );
  malla.frustumCulled = false;
  return malla;
}

/** Suelo lejano + tres cadenas de montañas: el horizonte nunca se corta. */
function construirHorizonte() {
  const g = new THREE.Group();
  const lejano = new THREE.Mesh(
    new THREE.CircleGeometry(340, 64),
    new THREE.MeshStandardMaterial({ color: 0x74a05f, roughness: 1 }),
  );
  lejano.rotation.x = -Math.PI / 2;
  lejano.position.y = -0.35;
  g.add(lejano);
  [
    [125, 55, 30, 1.3, 0.0],
    [190, 80, 52, 4.1, 0.3],
    [270, 110, 78, 7.7, 0.55],
  ].forEach(([r, a, h, s, t]) => g.add(crearCordillera(r, a, h, s, t)));
  return g;
}

function texturaMadera() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const g = c.getContext("2d");
  if (g) {
    g.fillStyle = "#6b4a2f";
    g.fillRect(0, 0, 64, 256);
    let s = 5;
    const r = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let i = 0; i < 46; i++) {
      g.fillStyle = r() < 0.5 ? "rgba(40,26,14,0.35)" : "rgba(150,112,74,0.25)";
      g.fillRect(r() * 64, 0, 1 + r() * 2.5, 256);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Postes de madera con brazo curvo, lámpara y luz cálida. Devuelve el ajuste por hora. */
function crearAlumbrado(env: THREE.Group) {
  const madera = new THREE.MeshStandardMaterial({ map: texturaMadera(), roughness: 1 });
  const metal = new THREE.MeshStandardMaterial({
    color: 0x2b2f33,
    roughness: 0.6,
    metalness: 0.5,
    side: THREE.DoubleSide,
  });
  const bombillo = new THREE.MeshStandardMaterial({
    color: 0xfff0d0,
    emissive: 0xffb76b,
    emissiveIntensity: 0,
    roughness: 0.4,
  });
  const cv = document.createElement("canvas");
  cv.width = cv.height = 64;
  const cx = cv.getContext("2d");
  if (cx) {
    const gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,214,150,1)");
    gr.addColorStop(0.35, "rgba(255,183,107,0.5)");
    gr.addColorStop(1, "rgba(255,183,107,0)");
    cx.fillStyle = gr;
    cx.fillRect(0, 0, 64, 64);
  }
  const matHalo = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(cv),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0,
  });
  const luces: THREE.PointLight[] = [];

  const poste = (x: number, z: number, conLuz: boolean) => {
    const g = new THREE.Group();
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, 6.2, 8), madera);
    tronco.position.y = 3.1;
    tronco.castShadow = true;
    g.add(tronco);
    const curva = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 6.1, 0),
      new THREE.Vector3(0.9, 7.1, 0),
      new THREE.Vector3(1.6, 6.55, 0),
    );
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 12, 0.045, 6, false), metal));
    const pantalla = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.26, 14, 1, true), metal);
    pantalla.position.set(1.6, 6.5, 0);
    g.add(pantalla);
    const foco = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), bombillo);
    foco.position.set(1.6, 6.36, 0);
    g.add(foco);
    const halo = new THREE.Sprite(matHalo);
    halo.scale.setScalar(3.2);
    halo.position.set(1.6, 6.3, 0);
    g.add(halo);
    if (conLuz) {
      const luz = new THREE.PointLight(0xffb76b, 0, 24, 2);
      luz.position.set(1.6, 6.2, 0);
      g.add(luz);
      luces.push(luz);
    }
    g.position.set(x, -0.17, z);
    g.rotation.y = x > 0 ? Math.PI : 0; // el brazo apunta hacia el centro
    env.add(g);
  };

  poste(3.4, 19, true);
  poste(-3.4, 27, true);
  poste(3.4, 35, false);
  poste(9.5, 8, true);
  poste(-9.5, -10, true);

  return (f: FaseDelDia) => {
    const n = NIVEL_LUZ_POSTES[f];
    bombillo.emissiveIntensity = n * 2.2;
    matHalo.opacity = n * 0.65;
    luces.forEach((l) => {
      l.intensity = 60 * n;
      l.visible = n > 0;
    });
  };
}

// --- Modo prueba (solo desarrollo): lecturas inventadas para ver el mapa de calor ---
const ESTADOS_PRUEBA = ["ok", "normal", "vigente", "en_rango", "activo", "online", "conectado", "alerta"];

function estadoVigenteDePrueba(): SensorVista["estado"] {
  const hallado = ESTADOS_PRUEBA.find((e) => esLecturaVigente(e as unknown as SensorVista["estado"]));
  return (hallado ?? "ok") as unknown as SensorVista["estado"];
}

function simularPuntos(reales: PuntoTermico[], largo: number): PuntoTermico[] {
  const estado = estadoVigenteDePrueba();
  const base: PuntoTermico[] =
    reales.length > 0
      ? reales
      : [0, 1, 2, 3].map((i) => ({
          id: -(i + 1),
          codigo: `SIM-${i + 1}`,
          x: i % 2 === 0 ? -2.4 : 2.4,
          z: ((i % 3) - 1) * (largo / 3),
          altura: 1.4,
          valor: null,
          minUmbral: null,
          maxUmbral: null,
          estado,
          sinCalibrar: false,
          antiguedadSegundos: 0,
        }));
  const temps = [24.2, 27.1, 29.8, 32.4, 25.6, 30.9];
  return base.map((p, i) => ({
    ...p,
    valor: temps[i % temps.length],
    estado,
    sinCalibrar: false,
    antiguedadSegundos: 5,
    minUmbral: p.minUmbral ?? 24,
    maxUmbral: p.maxUmbral ?? 28,
  }));
}

'''

SIM_ESTADO = '''  }, [galponVivo, largoInicial]);

  // Solo desarrollo: lecturas simuladas para probar el mapa de calor sin sensores
  const [simulando, setSimulando] = useState(false);
  const puntosBase = useMemo<PuntoTermico[]>(
    () => (simulando ? simularPuntos(puntosReales, largoInicial) : puntosReales),
    [simulando, puntosReales, largoInicial],
  );'''

BOTON_SIM = '''{import.meta.env.DEV && (
          <button
            type="button"
            className={`mt-btn${simulando ? " is-activo" : ""}`}
            aria-pressed={simulando}
            title="Solo desarrollo: simula lecturas de temperatura"
            onClick={() => setSimulando((v) => !v)}
          >
            Simular datos
          </button>
        )}

        {puedeEditar && ('''

HUD_VALOR = "{galpon.nombre}"
HUD_ETIQUETA = (
    '<span className="mt-metrica__etiqueta">'
    '{galpon.loteEnCurso ? `Lote ${galpon.loteEnCurso.codigo} · ${galponVivo?.diaVida ?? 1} d` : "Sin lote activo"}'
    "</span>"
)

VARS_VISTA = '''    const vis = { visible: true, ultimaInteraccion: performance.now(), ultimoRender: 0 };
    const obs = new IntersectionObserver((e) => {
      vis.visible = e[0]?.isIntersecting ?? true;
    });
    obs.observe(host);
    controls.addEventListener("change", () => {
      vis.ultimaInteraccion = performance.now();
    });
    let ultimoT = performance.now();'''

TICK_ARRANQUE = '''      raf = requestAnimationFrame(tick);
      const t0 = performance.now();
      if (!vis.visible || document.hidden) {
        ultimoT = t0; // fuera de pantalla no se dibuja
        return;
      }
      if (t0 - vis.ultimaInteraccion > 2000 && t0 - vis.ultimoRender < 32) return; // en reposo, 30 fps
      vis.ultimoRender = t0;'''

FASE_EXTRA = '''      sol.position.set(L.x * 1.2, L.y * 1.2, L.z * 1.2);
      scene.fog = new THREE.FogExp2(FOG_POR_FASE[f], 0.007);
      const ajusteEntorno = scene.userData.entornoFase as ((x: FaseDelDia) => void) | undefined;
      ajusteEntorno?.(f);'''


def salir(msg):
    sys.exit(msg + "\nNo se tocó nada.")


def main():
    try:
        src = open(TSX, encoding="utf-8").read()
    except FileNotFoundError:
        salir("No encuentro " + TSX + ". Corre desde avisens-frontend.")

    if "crearCordillera" in src:
        salir("El archivo ya tiene crearCordillera (¿ya corriste este parche?).")

    # Reemplazos de texto literal (cada ancla debe aparecer una sola vez)
    literales = [
        ("new THREE.PerspectiveCamera(36, 1, 0.1, 350)", "new THREE.PerspectiveCamera(36, 1, 0.5, 900)"),
        ("planoTermico.rotation.x = -Math.PI / 2;",
         "planoTermico.rotation.x = -Math.PI / 2;\n    (planoTermico.material as THREE.MeshBasicMaterial).fog = false;"),
        ("      sol.position.set(L.x * 1.2, L.y * 1.2, L.z * 1.2);", FASE_EXTRA),
        ("scene.add(entorno);", "scene.add(entorno);\n    scene.add(construirHorizonte());"),
        ("void enriquecerEntorno(entorno);",
         "void enriquecerEntorno(entorno);\n"
         "    scene.userData.entornoFase = entorno.userData.fase;\n"
         "    entorno.userData.fase?.(faseRef.current);"),
        ("  env.userData.procedurales = procedurales;",
         "  env.userData.procedurales = procedurales;\n  env.userData.fase = crearAlumbrado(env);"),
        ("    let ultimoT = performance.now();", VARS_VISTA),
        ("      raf = requestAnimationFrame(tick);", TICK_ARRANQUE),
        ("      ema = ema * 0.95 + Math.min(ahora - ultimoT, 100) * 0.05;",
         "      if (ahora - vis.ultimaInteraccion < 2000) ema = ema * 0.95 + Math.min(ahora - ultimoT, 100) * 0.05;"),
        ("      entorno.userData.muerto = true;", "      entorno.userData.muerto = true;\n      obs.disconnect();"),
        ("const puntosBase = useMemo<PuntoTermico[]>(() => {", "const puntosReales = useMemo<PuntoTermico[]>(() => {"),
        ("  }, [galponVivo, largoInicial]);", SIM_ESTADO),
        ('<span className="mt-metrica__etiqueta">Lote activo</span>', HUD_ETIQUETA),
        ("{puedeEditar && (", BOTON_SIM),
        ('import { cargarPiezasGranja, cargarGallina } from "@features/granjas/propietario/modeloGranja";',
         'import { cargarPiezasGranja, cargarGallina } from "@features/granjas/propietario/modeloGranja";\n'
         'import { esLecturaVigente } from "@features/monitoreo/hooks/useMonitoreoAmbiental";'),
        ("export function MapaTermicoGalpon(", FUNCIONES + "export function MapaTermicoGalpon("),
    ]
    for ancla, _ in literales:
        n = src.count(ancla)
        if n != 1:
            salir("Ancla con %d coincidencias (se esperaba 1):\n  %s" % (n, ancla.strip()[:110]))

    # Valor del HUD: puede variar la indentación, se busca con expresión regular
    patron = re.compile(
        r'\{galpon\.loteEnCurso\s*\?\s*`\$\{galpon\.loteEnCurso\.codigo\} \(\$\{galponVivo\?\.diaVida \?\? 1\} d\)`\s*:\s*"Sin lote"\}'
    )
    if len(patron.findall(src)) != 1:
        salir("No encontré el valor del HUD del lote (se esperaba 1 coincidencia).")

    for ancla, nuevo in literales:
        src = src.replace(ancla, nuevo, 1)
    src = patron.sub(HUD_VALOR, src, count=1)

    shutil.copy(TSX, TSX + ".bak-visual7")
    open(TSX, "w", encoding="utf-8").write(src)
    print("Listo. Respaldo en " + TSX + ".bak-visual7")


main()
