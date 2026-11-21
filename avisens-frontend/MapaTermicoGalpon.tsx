import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './MapaTermicoGalpon.css';

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export interface SensorTermico {
  id: string | number;
  nombre?: string;
  /** °C. null / NaN = sensor sin datos o con falla */
  temperatura: number | null;
  /** posición normalizada dentro del galpón (0..1) */
  x: number;
  z: number;
}

export interface MapaTermicoGalponProps {
  sensores: SensorTermico[];
  loteActivo?: string | null;
  /** Rango ideal para el cálculo de "% En Rango" */
  rangoMin?: number;
  rangoMax?: number;
  /** Muestra el botón Modo Edición (arrastrar sensores). */
  puedeEditar?: boolean;
  onMoverSensor?: (id: string | number, x: number, z: number) => void;
}

type Vista = 'superior' | '3d' | 'libre';

/* ------------------------------------------------------------------ */
/* Constantes                                                          */
/* ------------------------------------------------------------------ */

const LARGO = 24; // eje X
const ANCHO = 8; // eje Z
const ALTO_COLUMNA = 2.6;
const ALTO_CUMBRERA = 4.0;
const ALTO_MURETE = 0.6;
const Y_SENSOR = 0.35;

const C = {
  crema: 0xf5f2e8,
  verde: 0x165b49,
  verdeClaro: 0x1f7a62,
  dorado: 0xe4b84b,
  concreto: 0xcfcabb,
  metal: 0x9aa39d,
  pasto: 0x7fb069,
  pastoOscuro: 0x5c9a4a,
  tierra: 0xc9a77c,
  tronco: 0x7a5a3a,
};

const ESCALA: [number, string][] = [
  [18, '#3b82c4'],
  [22, '#4fb0a5'],
  [26, '#7cc15a'],
  [29, '#e4b84b'],
  [32, '#e07a3a'],
  [36, '#c8372d'],
];

const esValido = (t: number | null | undefined): t is number =>
  typeof t === 'number' && Number.isFinite(t);

const hexARgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

function colorTermico(t: number): [number, number, number] {
  if (t <= ESCALA[0][0]) return hexARgb(ESCALA[0][1]);
  for (let i = 1; i < ESCALA.length; i++) {
    if (t <= ESCALA[i][0]) {
      const [t0, c0] = ESCALA[i - 1];
      const [t1, c1] = ESCALA[i];
      const k = (t - t0) / (t1 - t0);
      const a = hexARgb(c0);
      const b = hexARgb(c1);
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    }
  }
  return hexARgb(ESCALA[ESCALA.length - 1][1]);
}

const gradienteLeyenda = `linear-gradient(90deg, ${ESCALA.map(([, c]) => c).join(', ')})`;

/* ------------------------------------------------------------------ */
/* Textura térmica (IDW) sobre canvas 2D                               */
/* ------------------------------------------------------------------ */

const TEX_W = 128;
const TEX_H = Math.round((TEX_W * ANCHO) / LARGO);

function dibujarTextura(
  canvas: HTMLCanvasElement,
  puntos: { x: number; z: number; t: number }[],
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(TEX_W, TEX_H);
  for (let py = 0; py < TEX_H; py++) {
    for (let px = 0; px < TEX_W; px++) {
      const u = px / (TEX_W - 1);
      const v = py / (TEX_H - 1);
      let r = 217, g = 214, b = 201, a = 235;
      if (puntos.length) {
        let num = 0;
        let den = 0;
        for (const p of puntos) {
          // distancia en metros (no normalizada) para que sea isotrópica
          const dx = (u - p.x) * LARGO;
          const dz = (v - p.z) * ANCHO;
          const d2 = dx * dx + dz * dz + 0.05;
          const w = 1 / (d2 * d2); // potencia 4: transiciones más locales
          num += w * p.t;
          den += w;
        }
        [r, g, b] = colorTermico(num / den);
      }
      const i = (py * TEX_W + px) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/* ------------------------------------------------------------------ */
/* Construcción 3D procedural                                          */
/* ------------------------------------------------------------------ */

const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02, ...extra });

function caja(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function construirGalpon() {
  const shed = new THREE.Group();
  const roof = new THREE.Group();
  const roofMats: THREE.Material[] = [];

  const mCrema = mat(C.crema);
  const mVerde = mat(C.verde);
  const mConcreto = mat(C.concreto);
  const mMetal = mat(C.metal, { metalness: 0.4, roughness: 0.5 });

  // Losa
  const losa = caja(LARGO + 0.6, 0.2, ANCHO + 0.6, mConcreto, 0, -0.1, 0);
  losa.castShadow = false;
  shed.add(losa);

  // Muretes
  for (const s of [-1, 1]) {
    shed.add(caja(LARGO, ALTO_MURETE, 0.2, mCrema, 0, ALTO_MURETE / 2, (s * ANCHO) / 2));
    shed.add(caja(0.2, ALTO_MURETE, ANCHO, mCrema, (s * LARGO) / 2, ALTO_MURETE / 2, 0));
  }

  // Cerchas: 7 pórticos
  const n = 7;
  const angulo = Math.atan2(ALTO_CUMBRERA - ALTO_COLUMNA, ANCHO / 2 + 0.3);
  const largoCercha = Math.hypot(ANCHO / 2 + 0.3, ALTO_CUMBRERA - ALTO_COLUMNA);
  for (let i = 0; i < n; i++) {
    const x = -LARGO / 2 + (i * LARGO) / (n - 1);
    for (const s of [-1, 1]) {
      shed.add(caja(0.18, ALTO_COLUMNA, 0.18, mVerde, x, ALTO_COLUMNA / 2, (s * ANCHO) / 2));
      const cuerda = caja(0.07, 0.07, largoCercha, mVerde, x, ALTO_COLUMNA + (ALTO_CUMBRERA - ALTO_COLUMNA) / 2 - 0.1, (s * (ANCHO / 2 + 0.3)) / 2);
      cuerda.rotation.x = s * angulo;
      cuerda.castShadow = false;
      shed.add(cuerda);
    }
    const tirante = caja(0.07, 0.07, ANCHO, mVerde, x, ALTO_COLUMNA, 0);
    tirante.castShadow = false;
    shed.add(tirante);
    const pendolon = caja(0.06, ALTO_CUMBRERA - ALTO_COLUMNA - 0.1, 0.06, mVerde, x, ALTO_COLUMNA + (ALTO_CUMBRERA - ALTO_COLUMNA - 0.1) / 2, 0);
    pendolon.castShadow = false;
    shed.add(pendolon);
  }
  // Vigas longitudinales
  for (const s of [-1, 1]) {
    const v = caja(LARGO, 0.1, 0.12, mVerde, 0, ALTO_COLUMNA, (s * ANCHO) / 2);
    v.castShadow = false;
    shed.add(v);
  }
  const cumbrera = caja(LARGO, 0.1, 0.1, mVerde, 0, ALTO_CUMBRERA - 0.08, 0);
  cumbrera.castShadow = false;
  shed.add(cumbrera);

  // Cortinas laterales amarillas translúcidas
  const mCortina = new THREE.MeshStandardMaterial({
    color: C.dorado,
    transparent: true,
    opacity: 0.38,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.6,
  });
  const altoCortina = ALTO_COLUMNA - ALTO_MURETE;
  for (const s of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(LARGO - 0.2, altoCortina), mCortina);
    c.position.set(0, ALTO_MURETE + altoCortina / 2, (s * ANCHO) / 2 + s * 0.02);
    shed.add(c);
  }
  // Malla en frentes
  const mMalla = new THREE.MeshStandardMaterial({
    color: 0xb7beb8,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO, altoCortina), mMalla);
    m.rotation.y = Math.PI / 2;
    m.position.set((s * LARGO) / 2, ALTO_MURETE + altoCortina / 2, 0);
    shed.add(m);
  }

  // Comederos (platos) instanciados
  const xs: number[] = [];
  for (let x = -10; x <= 10; x += 2) xs.push(x);
  const platoGeo = new THREE.CylinderGeometry(0.24, 0.2, 0.08, 16);
  const platos = new THREE.InstancedMesh(platoGeo, mMetal, xs.length * 2);
  const m4 = new THREE.Matrix4();
  let k = 0;
  for (const z of [-1.8, 1.8]) {
    for (const x of xs) {
      m4.makeTranslation(x, 0.06, z);
      platos.setMatrixAt(k++, m4);
    }
  }
  platos.castShadow = true;
  shed.add(platos);
  // Líneas de comedero colgadas
  for (const z of [-1.8, 1.8]) {
    const l = caja(LARGO - 2, 0.03, 0.03, mMetal, 0, 1.3, z);
    l.castShadow = false;
    shed.add(l);
  }

  // Bebederos (campanas) + línea de agua
  const mAgua = mat(0xdfe8e4, { roughness: 0.4 });
  const bebGeo = new THREE.CylinderGeometry(0.1, 0.14, 0.2, 14);
  const xb: number[] = [];
  for (let x = -10.5; x <= 10.5; x += 1.5) xb.push(x);
  const bebederos = new THREE.InstancedMesh(bebGeo, mAgua, xb.length * 2);
  k = 0;
  for (const z of [-0.55, 0.55]) {
    for (const x of xb) {
      m4.makeTranslation(x, 0.45, z);
      bebederos.setMatrixAt(k++, m4);
    }
    const l = caja(LARGO - 2, 0.03, 0.03, mMetal, 0, 1.6, z);
    l.castShadow = false;
    shed.add(l);
  }
  bebederos.castShadow = true;
  shed.add(bebederos);

  // Techo a dos aguas (se desvanece)
  const mTecho = new THREE.MeshStandardMaterial({
    color: C.verde,
    roughness: 0.7,
    transparent: true,
    opacity: 1,
  });
  const mCaballete = new THREE.MeshStandardMaterial({
    color: C.verdeClaro,
    roughness: 0.7,
    transparent: true,
    opacity: 1,
  });
  roofMats.push(mTecho, mCaballete);
  for (const s of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(LARGO + 1.0, 0.12, largoCercha + 0.2), mTecho);
    panel.position.set(0, ALTO_COLUMNA + (ALTO_CUMBRERA - ALTO_COLUMNA) / 2 + 0.02, (s * (ANCHO / 2 + 0.3)) / 2);
    panel.rotation.x = s * angulo;
    panel.receiveShadow = true;
    roof.add(panel);
  }
  const caballete = new THREE.Mesh(new THREE.BoxGeometry(LARGO + 1.0, 0.14, 0.4), mCaballete);
  caballete.position.set(0, ALTO_CUMBRERA + 0.04, 0);
  roof.add(caballete);
  shed.add(roof);

  return { shed, roof, roofMats };
}

function crearArbol(s: number, variante: number) {
  const g = new THREE.Group();
  const tronco = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 1.3 * s, 7),
    mat(C.tronco),
  );
  tronco.position.y = 0.65 * s;
  tronco.castShadow = true;
  g.add(tronco);
  const verdes = [0x3f8f4e, 0x58a65c, 0x4a9a55];
  const capas = 2 + (variante % 2);
  for (let i = 0; i < capas; i++) {
    const r = (1.0 - i * 0.22) * s;
    const f = new THREE.Mesh(
      new THREE.IcosahedronGeometry(r, 0),
      mat(verdes[(variante + i) % 3], { flatShading: true }),
    );
    f.position.y = (1.5 + i * 0.7) * s;
    f.rotation.y = i + variante;
    f.castShadow = true;
    g.add(f);
  }
  return g;
}

function construirEntorno() {
  const env = new THREE.Group();

  // Isla de pasto elíptica
  const isla = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 0.3, 64),
    mat(C.pasto),
  );
  isla.scale.set(30, 1, 19);
  isla.position.y = -0.35;
  isla.receiveShadow = true;
  env.add(isla);

  // Camino de tierra frente al galpón
  const camino = new THREE.Mesh(new THREE.BoxGeometry(3, 0.03, 11), mat(C.tierra));
  camino.position.set(0, -0.19, ANCHO / 2 + 5.6);
  camino.receiveShadow = true;
  env.add(camino);

  // Matas de pasto instanciadas (determinista)
  const matas = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.1, 0.35, 5),
    mat(C.pastoOscuro),
    160,
  );
  const m4 = new THREE.Matrix4();
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  let colocadas = 0;
  while (colocadas < 160) {
    const x = (rnd() * 2 - 1) * 28;
    const z = (rnd() * 2 - 1) * 17;
    if ((x / 29) ** 2 + (z / 18) ** 2 > 1) continue;
    if (Math.abs(x) < LARGO / 2 + 1 && Math.abs(z) < ANCHO / 2 + 1) continue;
    if (Math.abs(x) < 1.8 && z > 0) continue; // camino
    m4.makeTranslation(x, -0.03, z);
    matas.setMatrixAt(colocadas++, m4);
  }
  env.add(matas);

  // Árboles
  const pos: [number, number, number][] = [
    [-16, -9, 1.3], [-11, -11, 1.0], [-3, -12.5, 1.2], [6, -11.5, 1.4], [14, -10, 1.0],
    [18, -2, 1.2], [18, 6, 1.0], [-18, 4, 1.3], [-17, 10, 1.1], [11, 12, 1.0], [-9, 13, 1.2],
  ];
  pos.forEach(([x, z, s], i) => {
    const a = crearArbol(s, i);
    a.position.set(x, -0.2, z);
    env.add(a);
  });

  return env;
}

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

interface Contexto {
  marcadores: Map<string, THREE.Mesh>;
  grupoMarcadores: THREE.Group;
  texto: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
  irAVista: (v: Exclude<Vista, 'libre'>) => void;
}

export default function MapaTermicoGalpon({
  sensores,
  loteActivo,
  rangoMin = 24,
  rangoMax = 30,
  puedeEditar = true,
  onMoverSensor,
}: MapaTermicoGalponProps) {
  const visorRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<Contexto | null>(null);
  const badgesRef = useRef<Map<string, HTMLDivElement>>(new Map());

  const [vista, setVista] = useState<Vista>('3d');
  const [edicion, setEdicion] = useState(false);
  const [pos, setPos] = useState<Record<string, { x: number; z: number }>>({});

  // refs para que los listeners de Three siempre lean el último valor
  const edicionRef = useRef(edicion);
  const posRef = useRef(pos);
  const onMoverRef = useRef(onMoverSensor);
  edicionRef.current = edicion;
  posRef.current = pos;
  onMoverRef.current = onMoverSensor;

  // Sincroniza posiciones con las props
  useEffect(() => {
    const next: Record<string, { x: number; z: number }> = {};
    sensores.forEach((s) => {
      next[String(s.id)] = { x: s.x, z: s.z };
    });
    setPos(next);
  }, [sensores]);

  const stats = useMemo(() => {
    const v = sensores.map((s) => s.temperatura).filter(esValido);
    if (!v.length) return { promedio: null as number | null, enRango: null as number | null };
    const promedio = v.reduce((a, b) => a + b, 0) / v.length;
    const enRango = (v.filter((t) => t >= rangoMin && t <= rangoMax).length / v.length) * 100;
    return { promedio, enRango };
  }, [sensores, rangoMin, rangoMax]);

  /* ---------------------------- Escena ---------------------------- */
  useEffect(() => {
    const host = visorRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'mt-canvas';
    host.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;

    // Luces
    scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe9d3, 1.0));
    const sol = new THREE.DirectionalLight(0xfff4dc, 1.4);
    sol.position.set(14, 22, 12);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    const sc = sol.shadow.camera;
    sc.left = -26; sc.right = 26; sc.top = 20; sc.bottom = -20; sc.near = 1; sc.far = 70;
    sol.shadow.bias = -0.0005;
    scene.add(sol);

    // Contenido
    const entorno = construirEntorno();
    scene.add(entorno);
    const { shed, roof, roofMats } = construirGalpon();
    scene.add(shed);

    // Plano térmico
    const canvas = document.createElement('canvas');
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    dibujarTextura(canvas, []);
    const texto = new THREE.CanvasTexture(canvas);
    texto.colorSpace = THREE.SRGBColorSpace;
    texto.minFilter = THREE.LinearFilter;
    texto.magFilter = THREE.LinearFilter;
    const plano = new THREE.Mesh(
      new THREE.PlaneGeometry(LARGO - 0.4, ANCHO - 0.4),
      new THREE.MeshBasicMaterial({ map: texto, transparent: true, depthWrite: false }),
    );
    plano.rotation.x = -Math.PI / 2;
    plano.position.y = 0.04;
    plano.renderOrder = 1;
    scene.add(plano);

    const grupoMarcadores = new THREE.Group();
    scene.add(grupoMarcadores);

    // Plano invisible para arrastrar sensores
    const planoArrastre = new THREE.Plane(new THREE.Vector3(0, 1, 0), -Y_SENSOR);

    /* --- Encuadre --- */
    const target = new THREE.Vector3();
    let distancia = 30;
    const esf = new THREE.Spherical(30, 1.0, 0.5);

    const colocarCamara = () => {
      camera.position.setFromSpherical(esf).add(target);
      camera.lookAt(target);
    };

    const ajustar = () => {
      const w = Math.max(host.clientWidth, 1);
      const h = Math.max(host.clientHeight, 1);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      // Encuadre solo con el galpón (sin la isla), centrado exacto en Box3
      const box = new THREE.Box3().setFromObject(shed);
      const centro = box.getCenter(new THREE.Vector3());
      const radio = box.getSize(new THREE.Vector3()).length() / 2;
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
      distancia = (radio / Math.sin(Math.min(vFov, hFov) / 2)) * 0.78;

      target.copy(centro);
      controls.target.copy(centro);
      controls.minDistance = distancia * 0.35;
      controls.maxDistance = distancia * 1.8;

      const off = camera.position.clone().sub(controls.target);
      if (off.lengthSq() > 0.0001 && tween === null) {
        esf.setFromVector3(off);
      }
      esf.radius = THREE.MathUtils.clamp(esf.radius, distancia * 0.35, distancia * 1.8);
      if (!iniciado) {
        esf.radius = distancia;
        iniciado = true;
      }
      colocarCamara();
    };

    /* --- Vistas animadas --- */
    interface Tween { from: THREE.Spherical; to: THREE.Spherical; t0: number; dur: number }
    let tween: Tween | null = null;
    let iniciado = false;

    const irAVista = (v: Exclude<Vista, 'libre'>) => {
      const off = camera.position.clone().sub(controls.target);
      const from = new THREE.Spherical().setFromVector3(off);
      const to =
        v === 'superior'
          ? new THREE.Spherical(distancia, 0.001, from.theta)
          : new THREE.Spherical(distancia, 1.0, 0.55);
      // theta por el camino más corto
      while (to.theta - from.theta > Math.PI) to.theta -= Math.PI * 2;
      while (to.theta - from.theta < -Math.PI) to.theta += Math.PI * 2;
      tween = { from, to, t0: performance.now(), dur: 700 };
      setVista(v);
    };

    controls.addEventListener('start', () => {
      tween = null;
      setVista('libre');
    });

    /* --- Arrastre de sensores (modo edición) --- */
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const puntoTmp = new THREE.Vector3();
    let arrastrando: string | null = null;

    const actualizarNdc = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
    };

    const onDown = (e: PointerEvent) => {
      if (!edicionRef.current) return;
      actualizarNdc(e);
      const hit = raycaster.intersectObjects(grupoMarcadores.children, false)[0];
      if (hit) {
        arrastrando = String(hit.object.userData.id);
        controls.enabled = false;
        renderer.domElement.setPointerCapture(e.pointerId);
        renderer.domElement.style.cursor = 'grabbing';
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!edicionRef.current) return;
      actualizarNdc(e);
      if (arrastrando) {
        if (raycaster.ray.intersectPlane(planoArrastre, puntoTmp)) {
          const x = THREE.MathUtils.clamp(puntoTmp.x / LARGO + 0.5, 0.03, 0.97);
          const z = THREE.MathUtils.clamp(puntoTmp.z / ANCHO + 0.5, 0.05, 0.95);
          const id = arrastrando;
          setPos((p) => ({ ...p, [id]: { x, z } }));
        }
      } else {
        const hit = raycaster.intersectObjects(grupoMarcadores.children, false)[0];
        renderer.domElement.style.cursor = hit ? 'grab' : '';
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!arrastrando) return;
      const id = arrastrando;
      arrastrando = null;
      controls.enabled = true;
      renderer.domElement.releasePointerCapture(e.pointerId);
      renderer.domElement.style.cursor = '';
      const p = posRef.current[id];
      if (p) onMoverRef.current?.(id, p.x, p.z);
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerup', onUp);

    /* --- Loop --- */
    let raf = 0;
    let opacidadTecho = 1;
    const v3 = new THREE.Vector3();

    const tick = () => {
      raf = requestAnimationFrame(tick);

      if (tween) {
        const t = Math.min((performance.now() - tween.t0) / tween.dur, 1);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        esf.radius = tween.from.radius + (tween.to.radius - tween.from.radius) * e;
        esf.phi = tween.from.phi + (tween.to.phi - tween.from.phi) * e;
        esf.theta = tween.from.theta + (tween.to.theta - tween.from.theta) * e;
        colocarCamara();
        if (t >= 1) tween = null;
      }

      controls.update();

      // Techo: se desvanece al mirar desde arriba
      const polar = controls.getPolarAngle();
      const objetivo = THREE.MathUtils.clamp((polar - 0.5) / 0.3, 0, 1);
      opacidadTecho += (objetivo - opacidadTecho) * 0.18;
      roofMats.forEach((m) => {
        m.opacity = opacidadTecho;
        m.depthWrite = opacidadTecho > 0.98;
      });
      roof.visible = opacidadTecho > 0.02;

      renderer.render(scene, camera);

      // Badges flotantes
      const w = renderer.domElement.clientWidth;
      const h = renderer.domElement.clientHeight;
      grupoMarcadores.children.forEach((m) => {
        const el = badgesRef.current.get(String(m.userData.id));
        if (!el) return;
        v3.copy(m.position).project(camera);
        const visible = v3.z < 1;
        el.style.display = visible ? '' : 'none';
        if (visible) {
          el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * w}px, ${(-v3.y * 0.5 + 0.5) * h}px) translate(-50%, -135%)`;
        }
      });
    };

    ajustar();
    tick();

    const ro = new ResizeObserver(ajustar);
    ro.observe(host);

    ctxRef.current = { marcadores: new Map(), grupoMarcadores, texto, canvas, irAVista };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mt = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mt)) mt.forEach((x) => x.dispose());
        else mt?.dispose();
      });
      texto.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      ctxRef.current = null;
    };
  }, []);

  /* --------- Marcadores + textura cuando cambian datos/posiciones --------- */
  useEffect(() => {
    const c = ctxRef.current;
    if (!c) return;

    // crear / quitar marcadores según ids
    const ids = new Set(sensores.map((s) => String(s.id)));
    c.marcadores.forEach((mesh, id) => {
      if (!ids.has(id)) {
        c.grupoMarcadores.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        c.marcadores.delete(id);
      }
    });

    const puntos: { x: number; z: number; t: number }[] = [];
    sensores.forEach((s) => {
      const id = String(s.id);
      const p = pos[id] ?? { x: s.x, z: s.z };
      let mesh = c.marcadores.get(id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 16, 12),
          new THREE.MeshStandardMaterial({ color: C.verde, roughness: 0.4 }),
        );
        mesh.userData.id = id;
        mesh.castShadow = true;
        c.grupoMarcadores.add(mesh);
        c.marcadores.set(id, mesh);
      }
      mesh.position.set((p.x - 0.5) * LARGO, Y_SENSOR, (p.z - 0.5) * ANCHO);
      const ok = esValido(s.temperatura);
      (mesh.material as THREE.MeshStandardMaterial).color.setHex(ok ? C.verde : 0x8a8a80);
      if (ok) puntos.push({ x: p.x, z: p.z, t: s.temperatura as number });
    });

    dibujarTextura(c.canvas, puntos);
    c.texto.needsUpdate = true;
  }, [sensores, pos]);

  const sinSensores = sensores.length === 0;

  return (
    <section className="mt-contenedor" aria-label="Mapa térmico del galpón">
      <div className="mt-barra">
        <div className="mt-grupo" role="group" aria-label="Vista de cámara">
          <button
            type="button"
            className={`mt-btn ${vista === 'superior' ? 'is-activo' : ''}`}
            aria-pressed={vista === 'superior'}
            onClick={() => ctxRef.current?.irAVista('superior')}
          >
            Vista superior
          </button>
          <button
            type="button"
            className={`mt-btn ${vista === '3d' ? 'is-activo' : ''}`}
            aria-pressed={vista === '3d'}
            onClick={() => ctxRef.current?.irAVista('3d')}
          >
            Vista 3D
          </button>
        </div>
        {puedeEditar && (
          <button
            type="button"
            className={`mt-btn mt-btn--edicion ${edicion ? 'is-activo' : ''}`}
            aria-pressed={edicion}
            onClick={() => setEdicion((v) => !v)}
          >
            {edicion ? 'Terminar edición' : 'Modo edición'}
          </button>
        )}
      </div>

      <div className="mt-visor" ref={visorRef}>
        <div className="mt-hud">
          <div className="mt-metrica">
            <span className="mt-metrica__valor">
              {stats.promedio === null ? '—' : `${stats.promedio.toFixed(1)} °C`}
            </span>
            <span className="mt-metrica__etiqueta">Promedio</span>
          </div>
          <div className="mt-metrica">
            <span className="mt-metrica__valor">
              {stats.enRango === null ? '—' : `${Math.round(stats.enRango)} %`}
            </span>
            <span className="mt-metrica__etiqueta">En rango</span>
          </div>
          <div className="mt-metrica mt-metrica--lote">
            <span className="mt-metrica__valor">{loteActivo || 'Sin lote'}</span>
            <span className="mt-metrica__etiqueta">Lote activo</span>
          </div>
        </div>

        {sensores.map((s) => {
          const ok = esValido(s.temperatura);
          return (
            <div
              key={String(s.id)}
              ref={(el) => {
                if (el) badgesRef.current.set(String(s.id), el);
                else badgesRef.current.delete(String(s.id));
              }}
              className={`mt-badge ${ok ? '' : 'mt-badge--falla'}`}
            >
              <span className="mt-badge__nombre">{s.nombre ?? s.id}</span>
              <span className="mt-badge__valor">{ok ? `${(s.temperatura as number).toFixed(1)}°` : 'Sin datos'}</span>
            </div>
          );
        })}

        {edicion && <div className="mt-aviso">Arrastra un sensor para cambiar su posición.</div>}
        {sinSensores && <div className="mt-aviso mt-aviso--centro">Este galpón aún no tiene sensores.</div>}

        <div className="mt-leyenda" aria-hidden="true">
          <div className="mt-leyenda__barra" style={{ background: gradienteLeyenda }} />
          <div className="mt-leyenda__ejes">
            <span>{ESCALA[0][0]}°</span>
            <span>{ESCALA[ESCALA.length - 1][0]}°</span>
          </div>
        </div>
      </div>
    </section>
  );
}
