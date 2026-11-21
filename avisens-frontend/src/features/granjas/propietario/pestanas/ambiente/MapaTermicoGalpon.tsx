import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { toast } from "sonner";
import { listarZonas, type ZonaGalpon } from "@features/galpones/api/zonas";
import {
  useMonitoreoAmbiental,
  type SensorVista,
} from "@features/monitoreo/hooks/useMonitoreoAmbiental";
import {
  construirTexturaTermica,
  esSensorTermicoConFalla,
  type PuntoTermico,
} from "@features/monitoreo/utils/texturaTermica";
import { getRol } from "@shared/api";
import { permisosOperativosDeGalpon } from "@shared/auth/permisos";
import type { GalponConLotes } from "../../../hooks/useEstructuraGranjas";
import { cargarGalponDetallado } from "@features/dashboard/components/escena/modeloGalpon";
import { cargarPiezasGranja, cargarGallina } from "@features/granjas/propietario/modeloGranja";
import { esLecturaVigente } from "@features/monitoreo/hooks/useMonitoreoAmbiental";
import { LUCES } from "@features/dashboard/components/escena/lucesPorFase";
import { FONDOS_POR_FASE } from "@features/dashboard/components/escena/fondosPorFase";
import { useFaseDelDia } from "@features/dashboard/hooks/useFaseDelDia";
import type { FaseDelDia } from "@features/dashboard/model/escenaGalpon";
import "./MapaTermicoGalpon.css";

const ANCHO_BASE = 12; // eje X (metros)
const LARGO_BASE = 30; // eje Z (metros)
const ALTO_COLUMNA = 2.8;
const ALTO_CUMBRERA = 4.4;
const ALTO_MURETE = 0.65;
const COTA_PISO_TERMICO = 0.05;

const C = {
  crema: 0xf5f2e8,
  verde: 0x165b49,
  verdeClaro: 0x1f7a62,
  dorado: 0xe4b84b,
  concreto: 0xd8d4c7,
  metal: 0x9aa39d,
  pasto: 0x87b672,
  pastoOscuro: 0x629e4f,
  tierra: 0xcfb188,
  tronco: 0x7d5d3e,
};

type Vista = "superior" | "3d" | "libre";

type Props = {
  galpon: GalponConLotes;
  onIrABitacora?: (loteId: number) => void;
  onGuardado?: () => void;
};

function zonaPorCoordenadaZ(z: number, largo: number): string {
  const tercio = largo / 6;
  if (z > tercio) return "Zona 1 - Entrada";
  if (z < -tercio) return "Zona 3 - Fondo";
  return "Zona 2 - Centro";
}

const mat = (
  color: number,
  extra: THREE.MeshStandardMaterialParameters = {},
) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0.02,
    ...extra,
  });

function caja(
  w: number,
  h: number,
  d: number,
  m: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Construye el galpón 3D con orientación consistente:
 * Eje X = Ancho (12 m), Eje Z = Largo (30 m)
 */
function construirGalpon() {
  const shed = new THREE.Group();
  const roof = new THREE.Group();
  const roofMats: THREE.MeshStandardMaterial[] = [];

  const mCrema = mat(C.crema);
  const mVerde = mat(C.verde);
  const mConcreto = mat(C.concreto);
  const mMetal = mat(C.metal, { metalness: 0.35, roughness: 0.5 });

  // Losa base de concreto
  const losa = caja(
    ANCHO_BASE + 0.6,
    0.18,
    LARGO_BASE + 0.6,
    mConcreto,
    0,
    -0.09,
    0,
  );
  losa.castShadow = false;
  shed.add(losa);

  // Muretes bajos perimetrales en crema AVISENS
  for (const s of [-1, 1]) {
    shed.add(
      caja(
        0.22,
        ALTO_MURETE,
        LARGO_BASE,
        mCrema,
        (s * ANCHO_BASE) / 2,
        ALTO_MURETE / 2,
        0,
      ),
    );
    shed.add(
      caja(
        ANCHO_BASE + 0.22,
        ALTO_MURETE,
        0.22,
        mCrema,
        0,
        ALTO_MURETE / 2,
        (s * LARGO_BASE) / 2,
      ),
    );
  }

  // Cerchas y columnas estructurales (7 pórticos a lo largo del eje Z)
  const n = 7;
  const voladizo = 0.35;
  const angulo = Math.atan2(
    ALTO_CUMBRERA - ALTO_COLUMNA,
    ANCHO_BASE / 2 + voladizo,
  );
  const largoCercha = Math.hypot(
    ANCHO_BASE / 2 + voladizo,
    ALTO_CUMBRERA - ALTO_COLUMNA,
  );

  for (let i = 0; i < n; i++) {
    const z = -LARGO_BASE / 2 + (i * LARGO_BASE) / (n - 1);
    for (const s of [-1, 1]) {
      shed.add(
        caja(
          0.2,
          ALTO_COLUMNA,
          0.2,
          mVerde,
          (s * ANCHO_BASE) / 2,
          ALTO_COLUMNA / 2,
          z,
        ),
      );
      const cuerda = caja(
        largoCercha,
        0.08,
        0.08,
        mVerde,
        (s * (ANCHO_BASE / 2 + voladizo)) / 2,
        ALTO_COLUMNA + (ALTO_CUMBRERA - ALTO_COLUMNA) / 2 - 0.08,
        z,
      );
      cuerda.rotation.z = -s * angulo;
      cuerda.castShadow = false;
      shed.add(cuerda);
    }
    const tirante = caja(ANCHO_BASE, 0.08, 0.08, mVerde, 0, ALTO_COLUMNA, z);
    tirante.castShadow = false;
    shed.add(tirante);

    const pendolon = caja(
      0.07,
      ALTO_CUMBRERA - ALTO_COLUMNA - 0.08,
      0.07,
      mVerde,
      0,
      ALTO_COLUMNA + (ALTO_CUMBRERA - ALTO_COLUMNA - 0.08) / 2,
      z,
    );
    pendolon.castShadow = false;
    shed.add(pendolon);
  }

  // Vigas longitudinales y cumbrera
  for (const s of [-1, 1]) {
    const v = caja(
      0.12,
      0.1,
      LARGO_BASE,
      mVerde,
      (s * ANCHO_BASE) / 2,
      ALTO_COLUMNA,
      0,
    );
    v.castShadow = false;
    shed.add(v);
  }
  const cumbrera = caja(
    0.12,
    0.1,
    LARGO_BASE,
    mVerde,
    0,
    ALTO_CUMBRERA - 0.06,
    0,
  );
  cumbrera.castShadow = false;
  shed.add(cumbrera);

  // Cortinas laterales translúcidas en tono dorado AVISENS
  const altoCortina = ALTO_COLUMNA - ALTO_MURETE;
  const mCortina = new THREE.MeshStandardMaterial({
    color: C.dorado,
    transparent: true,
    opacity: 0.34,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.65,
  });
  for (const s of [-1, 1]) {
    const c = new THREE.Mesh(
      new THREE.PlaneGeometry(LARGO_BASE - 0.2, altoCortina),
      mCortina,
    );
    c.rotation.y = Math.PI / 2;
    c.position.set(
      (s * ANCHO_BASE) / 2 + s * 0.03,
      ALTO_MURETE + altoCortina / 2,
      0,
    );
    shed.add(c);
  }

  // Malla perimetral en frentes
  const mMalla = new THREE.MeshStandardMaterial({
    color: 0xb7beb8,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(ANCHO_BASE, altoCortina),
      mMalla,
    );
    m.position.set(
      0,
      ALTO_MURETE + altoCortina / 2,
      (s * LARGO_BASE) / 2,
    );
    shed.add(m);
  }

  // Líneas de comederos (platos) instanciados a lo largo de Z
  const zsComedero: number[] = [];
  for (let z = -12.5; z <= 12.5; z += 2.2) zsComedero.push(z);
  const platoGeo = new THREE.CylinderGeometry(0.28, 0.22, 0.09, 16);
  const platos = new THREE.InstancedMesh(
    platoGeo,
    mMetal,
    zsComedero.length * 2,
  );
  const m4 = new THREE.Matrix4();
  let k = 0;
  for (const x of [-2.8, 2.8]) {
    for (const z of zsComedero) {
      m4.makeTranslation(x, 0.07, z);
      platos.setMatrixAt(k++, m4);
    }
    const linea = caja(0.03, 0.03, LARGO_BASE - 2.5, mMetal, x, 1.35, 0);
    linea.castShadow = false;
    shed.add(linea);
  }
  platos.castShadow = true;
  shed.add(platos);

  // Líneas de bebederos (campanas) instanciados
  const mAgua = mat(0xe6efec, { roughness: 0.35 });
  const bebGeo = new THREE.CylinderGeometry(0.11, 0.16, 0.22, 14);
  const zsBebedero: number[] = [];
  for (let z = -12; z <= 12; z += 1.8) zsBebedero.push(z);
  const bebederos = new THREE.InstancedMesh(
    bebGeo,
    mAgua,
    zsBebedero.length * 2,
  );
  k = 0;
  for (const x of [-1.0, 1.0]) {
    for (const z of zsBebedero) {
      m4.makeTranslation(x, 0.46, z);
      bebederos.setMatrixAt(k++, m4);
    }
    const linea = caja(0.03, 0.03, LARGO_BASE - 2.5, mMetal, x, 1.65, 0);
    linea.castShadow = false;
    shed.add(linea);
  }
  bebederos.castShadow = true;
  shed.add(bebederos);

  // Techo a dos aguas verde bosque (se desvanece en vista superior)
  const mTecho = new THREE.MeshStandardMaterial({
    color: C.verde,
    roughness: 0.72,
    transparent: true,
    opacity: 1,
  });
  const mCaballete = new THREE.MeshStandardMaterial({
    color: C.verdeClaro,
    roughness: 0.72,
    transparent: true,
    opacity: 1,
  });
  roofMats.push(mTecho, mCaballete);

  for (const s of [-1, 1]) {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(largoCercha + 0.25, 0.12, LARGO_BASE + 1.0),
      mTecho,
    );
    panel.position.set(
      (s * (ANCHO_BASE / 2 + voladizo)) / 2,
      ALTO_COLUMNA + (ALTO_CUMBRERA - ALTO_COLUMNA) / 2 + 0.04,
      0,
    );
    panel.rotation.z = -s * angulo;
    panel.receiveShadow = true;
    roof.add(panel);
  }
  const caballete = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.14, LARGO_BASE + 1.0),
    mCaballete,
  );
  caballete.position.set(0, ALTO_CUMBRERA + 0.06, 0);
  roof.add(caballete);
  shed.add(roof);

  return { shed, roof, roofMats };
}

const VERDES = [0x7fb069, 0x6aa55a, 0x93c276, 0x5f9b57];

type TipoArbol = "redondo" | "cipres" | "arbusto";

/** Máscara en escala de grises (alphaMap lee el canal verde): blanco = opaco. */
function crearMascaraRadial() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d");
  if (g) {
    g.fillStyle = "#000";
    g.fillRect(0, 0, 512, 512);
    const grad = g.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0, "rgb(255,255,255)");
    grad.addColorStop(0.45, "rgb(255,255,255)");
    grad.addColorStop(1, "rgb(0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 512);
  }
  return new THREE.CanvasTexture(c);
}

/** Rectángulo con bordes difusos (sombra desplazada, sin filtros). */
function crearMascaraRect() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  if (g) {
    g.fillStyle = "#000";
    g.fillRect(0, 0, 256, 256);
    g.shadowColor = "#fff";
    g.shadowBlur = 36;
    g.shadowOffsetX = 2000;
    g.fillStyle = "#fff";
    g.fillRect(64 - 2000, 64, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

function crearArbol(tipo: TipoArbol, rnd: () => number) {
  const g = new THREE.Group();
  const verde = () =>
    mat(
      new THREE.Color(VERDES[Math.floor(rnd() * VERDES.length)])
        .offsetHSL((rnd() - 0.5) * 0.03, 0, (rnd() - 0.5) * 0.06)
        .getHex(),
      { flatShading: true },
    );

  if (tipo === "arbusto") {
    const s = 0.8 + rnd() * 0.6;
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(
        new THREE.IcosahedronGeometry((0.5 + rnd() * 0.3) * s, 1),
        verde(),
      );
      b.position.set((rnd() - 0.5) * 0.9 * s, 0.3 * s, (rnd() - 0.5) * 0.9 * s);
      b.scale.y = 0.75;
      b.castShadow = true;
      g.add(b);
    }
    return g;
  }

  const s = tipo === "cipres" ? 1.0 + rnd() * 0.7 : 1.1 + rnd() * 0.9;
  const altoTronco = (tipo === "cipres" ? 0.8 : 1.6) * s;
  const tronco = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1 * s, 0.17 * s, altoTronco, 6),
    mat(C.tronco),
  );
  tronco.position.y = altoTronco / 2;
  tronco.castShadow = true;
  g.add(tronco);

  if (tipo === "cipres") {
    for (let i = 0; i < 3; i++) {
      const cono = new THREE.Mesh(
        new THREE.ConeGeometry((0.95 - i * 0.24) * s, 1.8 * s, 7),
        verde(),
      );
      cono.position.y = altoTronco + (0.6 + i * 1.0) * s;
      cono.castShadow = true;
      g.add(cono);
    }
  } else {
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(
        new THREE.IcosahedronGeometry((0.8 + rnd() * 0.4) * s, 1),
        verde(),
      );
      f.position.set(
        (rnd() - 0.5) * 1.1 * s,
        altoTronco + (0.5 + rnd() * 0.9) * s,
        (rnd() - 0.5) * 1.1 * s,
      );
      f.scale.y = 0.85;
      f.rotation.y = rnd() * 6;
      f.castShadow = true;
      g.add(f);
    }
  }
  g.rotation.y = rnd() * Math.PI * 2;
  return g;
}

function pintarSuelo() {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d");
  if (g) {
    g.fillStyle = "#87b672";
    g.fillRect(0, 0, 1024, 1024);
    let s = 3;
    const r = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    const tonos = ["122,168,98", "148,189,118", "111,159,90", "156,196,126", "176,190,120"];
    for (let i = 0; i < 110; i++) {
      const x = r() * 1024;
      const y = r() * 1024;
      const rad = 30 + r() * 110;
      const t = tonos[i % tonos.length];
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, `rgba(${t},0.4)`);
      grad.addColorStop(1, `rgba(${t},0)`);
      g.fillStyle = grad;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function liberarGrupo(raiz: THREE.Object3D) {
  raiz.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mt = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mt)) mt.forEach((x) => x.dispose());
    else mt?.dispose();
  });
}

/** Escala la pieza a una altura dada y la apoya en y=0, centrada en su grupo. */
function normalizar(obj: THREE.Object3D, alto: number) {
  const w = new THREE.Group();
  obj.position.set(0, 0, 0);
  obj.updateMatrixWorld(true);
  const caja = new THREE.Box3().setFromObject(obj);
  const tam = caja.getSize(new THREE.Vector3());
  const c = caja.getCenter(new THREE.Vector3());
  const k = tam.y > 0 ? alto / tam.y : 1;
  obj.scale.multiplyScalar(k);
  obj.position.set(-c.x * k, -caja.min.y * k, -c.z * k);
  w.add(obj);
  w.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return w;
}

function construirEntorno() {
  const env = new THREE.Group();
  let seed = 11;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  // Suelo grande con el color pintado en una sola textura (una capa, bordes difusos)
  const base = new THREE.Mesh(
    new THREE.CircleGeometry(95, 72),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: pintarSuelo(),
      roughness: 1,
      alphaMap: crearMascaraRadial(),
      transparent: true,
      depthWrite: false,
    }),
  );
  base.rotation.x = -Math.PI / 2;
  base.position.y = -0.17;
  base.renderOrder = -3;
  base.receiveShadow = true;
  env.add(base);

  // Explanada de tierra alrededor del galpón + camino de entrada (bordes suaves)
  const rect = crearMascaraRect();
  const matTierra = () =>
    new THREE.MeshStandardMaterial({
      color: C.tierra,
      roughness: 1,
      alphaMap: rect,
      transparent: true,
      depthWrite: false,
    });
  const explanada = new THREE.Mesh(
    new THREE.PlaneGeometry(ANCHO_BASE + 9, LARGO_BASE + 9),
    matTierra(),
  );
  explanada.rotation.x = -Math.PI / 2;
  explanada.position.y = -0.15;
  explanada.renderOrder = -1;
  explanada.receiveShadow = true;
  env.add(explanada);

  const camino = new THREE.Mesh(new THREE.PlaneGeometry(5, 30), matTierra());
  camino.rotation.x = -Math.PI / 2;
  camino.position.set(0, -0.148, LARGO_BASE / 2 + 11);
  camino.renderOrder = -1;
  camino.receiveShadow = true;
  env.add(camino);

  // Matas de pasto con variación de tono y tamaño
  const N = 200;
  const matas = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.1, 0.38, 5),
    mat(0xffffff),
    N,
  );
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  const tonosMata = [0x629e4f, 0x78ad5e, 0x558f48];
  let k = 0;
  while (k < N) {
    const x = (rnd() * 2 - 1) * 42;
    const z = (rnd() * 2 - 1) * 48;
    if (Math.abs(x) < ANCHO_BASE / 2 + 2 && Math.abs(z) < LARGO_BASE / 2 + 2) continue;
    if (Math.abs(x) < 2.6 && z > 0) continue;
    dummy.position.set(x, -0.16, z);
    dummy.rotation.y = rnd() * Math.PI;
    const e = 0.8 + rnd() * 0.9;
    dummy.scale.set(e, 0.7 + rnd() * 1.1, e);
    dummy.updateMatrix();
    matas.setMatrixAt(k, dummy.matrix);
    matas.setColorAt(k, col.setHex(tonosMata[k % tonosMata.length]));
    k++;
  }
  env.add(matas);

  // Árboles procedurales: respaldo mientras cargan (o si fallan) los de la granja
  const procedurales = new THREE.Group();
  const bosquetes: [number, number, number][] = [
    [-15, -22, 4], [16, -9, 3], [-18, 12, 3], [19, 16, 4], [-12, 30, 3], [0, -33, 5], [16, 33, 3],
  ];
  bosquetes.forEach(([cx, cz, n]) => {
    for (let i = 0; i < n; i++) {
      const x = cx + (rnd() - 0.5) * 9;
      const z = cz + (rnd() - 0.5) * 9;
      if (Math.abs(x) < 4 && z > 10) continue;
      const r = rnd();
      const tipo: TipoArbol = r < 0.45 ? "redondo" : r < 0.7 ? "cipres" : "arbusto";
      const a = crearArbol(tipo, rnd);
      a.position.set(x, -0.17, z);
      procedurales.add(a);
    }
  });
  env.add(procedurales);
  env.userData.procedurales = procedurales;
  env.userData.fase = crearAlumbrado(env);

  // Arbustos pegados a los muros laterales
  for (let i = 0; i < 8; i++) {
    const lado = i % 2 === 0 ? 1 : -1;
    const a = crearArbol("arbusto", rnd);
    a.position.set(lado * (ANCHO_BASE / 2 + 1.9 + rnd() * 0.8), -0.17, (rnd() * 2 - 1) * 13);
    env.add(a);
  }

  return env;
}

const SITIOS_GALLINAS: [number, number][] = [
  [7, 20], [-6, 24], [11, 28], [-10, 17], [14, -19], [-13, -21], [18, 8], [-17, -5], [4, 32],
];

/** Suma al entorno las piezas de la ficha de granja (casa, tanque, bodega, árboles) y gallinas. */
async function enriquecerEntorno(env: THREE.Group) {
  const [piezas, gallina] = await Promise.all([cargarPiezasGranja(), cargarGallina()]);
  if (env.userData.muerto) return;

  let s = 29;
  const r = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const poner = (obj: THREE.Object3D, alto: number, x: number, z: number, giro: number) => {
    const w = normalizar(obj, alto);
    w.position.set(x, -0.17, z);
    w.rotation.y = giro;
    env.add(w);
    return w;
  };

  if (piezas) {
    const reservados: [number, number][] = [[-22, -8], [17, -16], [-16, 20]];
    const ocupado = (x: number, z: number) =>
      reservados.some(([a, b]) => Math.hypot(x - a, z - b) < 7);

    if (piezas.arboles.length > 0) {
      const proc = env.userData.procedurales as THREE.Group | undefined;
      if (proc) {
        env.remove(proc);
        liberarGrupo(proc);
      }
      const bosquetes: [number, number, number][] = [
        [-15, -24, 4], [17, -4, 4], [-19, 10, 3], [20, 18, 4], [-10, 31, 3], [2, -34, 5], [16, 34, 3],
      ];
      bosquetes.forEach(([cx, cz, n]) => {
        for (let i = 0; i < n; i++) {
          const x = cx + (r() - 0.5) * 9;
          const z = cz + (r() - 0.5) * 9;
          if ((Math.abs(x) < 4 && z > 10) || ocupado(x, z)) continue;
          const orig = piezas.arboles[Math.floor(r() * piezas.arboles.length)];
          poner(orig.clone(true), 5 + r() * 4, x, z, r() * Math.PI * 2);
        }
      });
    }
    if (piezas.casa) poner(piezas.casa, 7.5, -22, -8, Math.PI / 2);
    if (piezas.tanque) poner(piezas.tanque, 7, 17, -16, 0);
    if (piezas.bodega) poner(piezas.bodega, 3.6, -16, 20, Math.PI / 4);
  }

  if (gallina) {
    const aves: { g: THREE.Object3D; cx: number; cz: number; r: number; w: number; f: number }[] = [];
    SITIOS_GALLINAS.forEach(([cx, cz], i) => {
      const g = normalizar(gallina.clone(true), 1.1);
      env.add(g);
      aves.push({ g, cx, cz, r: 1.2 + r() * 1.6, w: (0.25 + r() * 0.3) * (i % 2 ? 1 : -1), f: r() * 6.28 });
    });
    env.userData.animar = (t: number) => {
      aves.forEach((a) => {
        const ang = t * a.w + a.f;
        const signo = Math.sign(a.w);
        a.g.position.set(
          a.cx + Math.cos(ang) * a.r,
          -0.17 + Math.abs(Math.sin(t * 6 + a.f)) * 0.06,
          a.cz + Math.sin(ang) * a.r,
        );
        a.g.rotation.y = Math.atan2(-Math.sin(ang) * signo, Math.cos(ang) * signo);
      });
    };
  }
}

const FOG_POR_FASE: Record<FaseDelDia, number> = {
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
  const cBase = new THREE.Color(0x2f6f3c);
  const cMedia = new THREE.Color(0x68a357);
  const cAlta = new THREE.Color(0xc3ccc4);
  const cFria = new THREE.Color(0x8fb0c8);
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
    const h = hMax * (0.5 + 0.5 * cresta);
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
    [95, 45, 40, 1.3, 0.0],
    [150, 70, 66, 4.1, 0.18],
    [220, 95, 96, 7.7, 0.35],
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

/** Mantiene un sensor dentro del galpón (coordenadas en metros, centradas en 0). */
function limitar(valor: number, total: number) {
  const mitad = Math.max(0.5, total / 2 - 0.4);
  return Math.max(-mitad, Math.min(mitad, valor));
}

export function MapaTermicoGalpon({
  galpon,
  onIrABitacora,
  onGuardado,
}: Props) {
  const puedeEditar = permisosOperativosDeGalpon(getRol()).configurar;
  const { galpones: galponesMonitoreo } = useMonitoreoAmbiental();

  const galponVivo = useMemo(
    () => galponesMonitoreo.find((g) => g.id === galpon.id) ?? null,
    [galponesMonitoreo, galpon.id],
  );

  const anchoInicial = galponVivo?.anchoMetros ?? ANCHO_BASE;
  const largoInicial = galponVivo?.largoMetros ?? LARGO_BASE;

  const [vista, setVista] = useState<Vista>("3d");
  const [modoEdicion, setModoEdicion] = useState(false);
  const [zonas, setZonas] = useState<ZonaGalpon[]>([]);
  const [dimensiones, setDimensiones] = useState({
    ancho: anchoInicial,
    largo: largoInicial,
  });
  const [puntosEditados, setPuntosEditados] = useState<PuntoTermico[]>([]);
  const [sensorSeleccionadoId, setSensorSeleccionadoId] = useState<
    number | null
  >(null);

  const visorRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(null as ((f: number) => void) | null);
  const fase = useFaseDelDia();
  const faseRef = useRef(fase);
  faseRef.current = fase;
  const luzRef = useRef(null as ((f: FaseDelDia) => void) | null);
  const [termico, setTermico] = useState(true);
  const termicoRef = useRef(true);
  termicoRef.current = termico;
  useEffect(() => {
    luzRef.current?.(fase);
  }, [fase]);
  const badgesRef = useRef(new Map<number, HTMLDivElement>());
  const ctxRef = useRef<{
    marcadores: Map<number, THREE.Mesh>;
    grupoMarcadores: THREE.Group;
    planoTermico: THREE.Mesh;
    shed: THREE.Group;
    entorno: THREE.Group;
    irAVista: (v: Exclude<Vista, "libre">) => void;
    reencuadrar: () => void;
  } | null>(null);

  const modoEdicionRef = useRef(modoEdicion);
  const dimensionesRef = useRef(dimensiones);
  modoEdicionRef.current = modoEdicion;
  dimensionesRef.current = dimensiones;

  const puntosReales = useMemo<PuntoTermico[]>(() => {
    const sensoresFuente: SensorVista[] = galponVivo?.sensores ?? [];
    const sensoresTemp = sensoresFuente.filter(
      (s) =>
        s.variableUmbral === "temperatura" ||
        s.tipo.toLowerCase().includes("temp"),
    );
    const lista = sensoresTemp.length > 0 ? sensoresTemp : sensoresFuente;

    return lista.map((s, idx) => {
      const col = idx % 2 === 0 ? -2.4 : 2.4;
      const fila = ((idx % 3) - 1) * (largoInicial / 3);
      return {
        id: s.id,
        codigo: s.codigo,
        x: limitar(s.x ?? col, anchoInicial),
        z: limitar(s.y ?? fila, largoInicial),
        altura: s.alturaMetros ?? 1.4,
        valor: s.valor,
        minUmbral: s.minUmbral,
        maxUmbral: s.maxUmbral,
        estado: s.estado,
        sinCalibrar: s.sinCalibrar,
        antiguedadSegundos: s.antiguedadSegundos ?? null,
      };
    });
  }, [galponVivo, largoInicial, anchoInicial]);

  // Solo desarrollo: lecturas simuladas para probar el mapa de calor sin sensores
  const [simulando, setSimulando] = useState(false);
  const puntosBase = useMemo<PuntoTermico[]>(
    () => (simulando ? simularPuntos(puntosReales, largoInicial) : puntosReales),
    [simulando, puntosReales, largoInicial],
  );

  useEffect(() => {
    if (!modoEdicion) {
      setDimensiones({ ancho: anchoInicial, largo: largoInicial });
      setPuntosEditados(puntosBase);
    }
  }, [anchoInicial, largoInicial, puntosBase, modoEdicion]);

  useEffect(() => {
    void listarZonas(galpon.id)
      .then(setZonas)
      .catch(() => setZonas([]));
  }, [galpon.id]);

  const puntosActivos = modoEdicion ? puntosEditados : puntosBase;

  const metricas = useMemo(() => {
    const operativos = puntosActivos.filter((p) => !esSensorTermicoConFalla(p));
    if (operativos.length === 0) {
      return { promedio: null, porcentajeRango: null };
    }
    const suma = operativos.reduce((acc, p) => acc + (p.valor ?? 0), 0);
    const enRango = operativos.filter((p) => p.estado === "optimo").length;
    return {
      promedio: suma / operativos.length,
      porcentajeRango: Math.round((enRango / operativos.length) * 100),
    };
  }, [puntosActivos]);

  // Inicialización de escena Three.js
  useEffect(() => {
    const host = visorRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.className = "mt-canvas";
    host.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 900);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;

    // Iluminación cálida diurna
    const hemi = new THREE.HemisphereLight(0xffffff, 0xdfe9d3, 1.1);
    scene.add(hemi);
    const sol = new THREE.DirectionalLight(0xfff4dc, 1.45);
    sol.position.set(16, 26, 18);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    const sc = sol.shadow.camera;
    sc.left = -28;
    sc.right = 28;
    sc.top = 28;
    sc.bottom = -28;
    sc.near = 1;
    sc.far = 80;
    sol.shadow.bias = -0.0005;
    scene.add(sol);

    // Luces y fondo según la hora del día (mismos valores del inicio)
    const aplicarFase = (f: FaseDelDia) => {
      const L = LUCES[f];
      hemi.color.setHex(L.cielo);
      hemi.groundColor.setHex(L.suelo);
      hemi.intensity = L.ambiente;
      sol.color.setHex(L.sol);
      sol.intensity = L.fuerza * 0.8;
      sol.position.set(L.x * 1.2, L.y * 1.2, L.z * 1.2);
      scene.fog = new THREE.FogExp2(FOG_POR_FASE[f], 0.007);
      const ajusteEntorno = scene.userData.entornoFase as ((x: FaseDelDia) => void) | undefined;
      ajusteEntorno?.(f);
      host.style.background = `url(${FONDOS_POR_FASE[f]}) center bottom / cover no-repeat`;
    };
    luzRef.current = aplicarFase;
    aplicarFase(faseRef.current);

    const entorno = construirEntorno();
    void enriquecerEntorno(entorno);
    scene.userData.entornoFase = entorno.userData.fase;
    entorno.userData.fase?.(faseRef.current);
    scene.add(entorno);
    scene.add(construirHorizonte());
    let { shed, roof, roofMats } = construirGalpon();
    scene.add(shed);

    // Galpón real (.glb) con el mismo detalle del inicio; el procedural queda de respaldo
    let cancelado = false;
    void cargarGalponDetallado().then((g) => {
      if (cancelado || !g) return;
      const { cuerpo, techo } = g;
      const todo = new THREE.Group();
      todo.add(cuerpo, techo);
      const caja = new THREE.Box3().setFromObject(cuerpo);
      const centro = caja.getCenter(new THREE.Vector3());
      todo.position.set(-centro.x, -caja.min.y, -centro.z);

      const techoMats: THREE.MeshStandardMaterial[] = [];
      techo.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || Array.isArray(m.material)) return;
        const mt = m.material as THREE.MeshStandardMaterial;
        mt.transparent = true;
        m.castShadow = false;
        techoMats.push(mt);
      });

      scene.remove(shed);
      scene.add(todo);
      shed = todo;
      roof = techo;
      roofMats = techoMats;
      entorno.position.y = 0.25; // el suelo queda al pie de la losa del .glb
      planoTermico.position.y = 0.3; // y el plano térmico sobre la losa
      reencuadrar();
    });

    // Plano térmico sobre el piso del galpón
    const planoTermico = new THREE.Mesh(
      new THREE.PlaneGeometry(ANCHO_BASE - 0.3, LARGO_BASE - 0.3),
      new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    );
    planoTermico.rotation.x = -Math.PI / 2;
    (planoTermico.material as THREE.MeshBasicMaterial).fog = false;
    planoTermico.position.y = COTA_PISO_TERMICO;
    planoTermico.renderOrder = 1;
    scene.add(planoTermico);

    const grupoMarcadores = new THREE.Group();
    scene.add(grupoMarcadores);

    const planoArrastre = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.2);

    // Encuadre centrado exacto sobre el Box3 del galpón (sin la isla)
    const target = new THREE.Vector3();
    let distancia = 36;
    const esf = new THREE.Spherical(36, 1.02, 0.55);
    interface Tween {
      from: THREE.Spherical;
      to: THREE.Spherical;
      t0: number;
      dur: number;
    }
    let tween: Tween | null = null;
    let iniciado = false;

    const colocarCamara = () => {
      camera.position.setFromSpherical(esf).add(target);
      camera.lookAt(target);
    };

    const reencuadrar = () => {
      const w = Math.max(host.clientWidth, 1);
      const h = Math.max(host.clientHeight, 1);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      const box = new THREE.Box3().setFromObject(shed);
      const centro = box.getCenter(new THREE.Vector3());
      const radio = box.getSize(new THREE.Vector3()).length() / 2;
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
      distancia = (radio / Math.sin(Math.min(vFov, hFov) / 2)) * 0.84;

      target.copy(centro);
      controls.target.copy(centro);
      controls.minDistance = distancia * 0.35;
      controls.maxDistance = distancia * 1.9;

      const off = camera.position.clone().sub(controls.target);
      if (off.lengthSq() > 0.0001 && tween === null) {
        esf.setFromVector3(off);
      }
      esf.radius = THREE.MathUtils.clamp(
        esf.radius,
        distancia * 0.35,
        distancia * 1.9,
      );
      if (!iniciado) {
        esf.radius = distancia;
        iniciado = true;
      }
      colocarCamara();
    };

    const irAVista = (v: Exclude<Vista, "libre">) => {
      const off = camera.position.clone().sub(controls.target);
      const from = new THREE.Spherical().setFromVector3(off);
      const to =
        v === "superior"
          ? new THREE.Spherical(distancia * 0.96, 0.001, from.theta)
          : new THREE.Spherical(distancia, 1.02, 0.55);
      while (to.theta - from.theta > Math.PI) to.theta -= Math.PI * 2;
      while (to.theta - from.theta < -Math.PI) to.theta += Math.PI * 2;
      tween = { from, to, t0: performance.now(), dur: 650 };
      setVista(v);
    };

    controls.addEventListener("start", () => {
      tween = null;
      setVista("libre");
    });

    // Arrastre de sensores sobre el plano X/Z en Modo Edición
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const puntoTmp = new THREE.Vector3();
    let arrastrandoId: number | null = null;

    const actualizarNdc = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
    };

    const onDown = (e: PointerEvent) => {
      if (!modoEdicionRef.current) return;
      actualizarNdc(e);
      const hit = raycaster.intersectObjects(
        grupoMarcadores.children,
        false,
      )[0];
      if (hit) {
        const punto = hit.object.userData.punto as PuntoTermico;
        arrastrandoId = punto.id;
        setSensorSeleccionadoId(punto.id);
        planoArrastre.constant = -Math.max(0.4, punto.altura);
        controls.enabled = false;
        renderer.domElement.setPointerCapture(e.pointerId);
        renderer.domElement.style.cursor = "grabbing";
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!modoEdicionRef.current) return;
      actualizarNdc(e);
      if (arrastrandoId !== null) {
        if (raycaster.ray.intersectPlane(planoArrastre, puntoTmp)) {
          const limX = dimensionesRef.current.ancho / 2 - 0.5;
          const limZ = dimensionesRef.current.largo / 2 - 0.5;
          const nx = Number(
            THREE.MathUtils.clamp(puntoTmp.x, -limX, limX).toFixed(2),
          );
          const nz = Number(
            THREE.MathUtils.clamp(puntoTmp.z, -limZ, limZ).toFixed(2),
          );
          const id = arrastrandoId;
          setPuntosEditados((prev) =>
            prev.map((p) => (p.id === id ? { ...p, x: nx, z: nz } : p)),
          );
        }
      } else {
        const hit = raycaster.intersectObjects(
          grupoMarcadores.children,
          false,
        )[0];
        renderer.domElement.style.cursor = hit ? "grab" : "";
      }
    };

    const onUp = (e: PointerEvent) => {
      if (arrastrandoId === null) return;
      arrastrandoId = null;
      controls.enabled = true;
      renderer.domElement.releasePointerCapture(e.pointerId);
      renderer.domElement.style.cursor = "";
    };

    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);

    let raf = 0;
    let opacidadTecho = 1;
    const v3 = new THREE.Vector3();

    zoomRef.current = (f: number) => {
      tween = null;
      const off = camera.position.clone().sub(controls.target);
      const d = THREE.MathUtils.clamp(
        off.length() * f,
        controls.minDistance,
        controls.maxDistance,
      );
      camera.position.copy(controls.target).add(off.setLength(d));
      controls.update();
    };

    const vis = { visible: true, ultimaInteraccion: performance.now(), ultimoRender: 0 };
    const obs = new IntersectionObserver((e) => {
      vis.visible = e[0]?.isIntersecting ?? true;
    });
    obs.observe(host);
    controls.addEventListener("change", () => {
      vis.ultimaInteraccion = performance.now();
    });
    let ultimoT = performance.now();
    let ema = 16;
    let cuadros = 0;
    let nivelCalidad = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t0 = performance.now();
      if (!vis.visible || document.hidden) {
        ultimoT = t0; // fuera de pantalla no se dibuja
        return;
      }
      if (t0 - vis.ultimaInteraccion > 2000 && t0 - vis.ultimoRender < 32) return; // en reposo, 30 fps
      vis.ultimoRender = t0;

      if (tween) {
        const t = Math.min((performance.now() - tween.t0) / tween.dur, 1);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        esf.radius =
          tween.from.radius + (tween.to.radius - tween.from.radius) * e;
        esf.phi = tween.from.phi + (tween.to.phi - tween.from.phi) * e;
        esf.theta = tween.from.theta + (tween.to.theta - tween.from.theta) * e;
        colocarCamara();
        if (t >= 1) tween = null;
      }

      controls.update();

      // Techo: se desvanece automáticamente al mirar desde arriba
      const polar = controls.getPolarAngle();
      const objetivo = THREE.MathUtils.clamp((polar - 0.35) / 0.6, 0, 1);
      opacidadTecho += (objetivo - opacidadTecho) * 0.18;
      roofMats.forEach((m) => {
        m.opacity = 0.04 + opacidadTecho * 0.96;
        m.depthWrite = opacidadTecho > 0.98;
      });
      roof.visible = true;

      const ahora = performance.now();
      if (ahora - vis.ultimaInteraccion < 2000) ema = ema * 0.95 + Math.min(ahora - ultimoT, 100) * 0.05;
      ultimoT = ahora;
      cuadros += 1;
      if (cuadros > 120 && ema > 34 && nivelCalidad < 2) {
        // equipo lento: baja la calidad en dos pasos (resolución, luego sombras)
        nivelCalidad += 1;
        ema = 16;
        if (nivelCalidad === 1) {
          renderer.setPixelRatio(1);
          renderer.setSize(host.clientWidth, host.clientHeight, false);
        } else {
          sol.castShadow = false;
        }
      }
      entorno.userData.animar?.(ahora / 1000);
      planoTermico.visible = termicoRef.current;
      grupoMarcadores.visible = termicoRef.current;
      renderer.render(scene, camera);

      // Posicionar badges flotantes sobre cada sensor
      const w = renderer.domElement.clientWidth;
      const h = renderer.domElement.clientHeight;
      grupoMarcadores.children.forEach((m) => {
        const punto = m.userData.punto as PuntoTermico | undefined;
        if (!punto) return;
        const el = badgesRef.current.get(punto.id);
        if (!el) return;
        v3.copy(m.position).project(camera);
        const visible = v3.z < 1;
        el.style.display = visible ? "" : "none";
        if (visible) {
          el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * w}px, ${(-v3.y * 0.5 + 0.5) * h}px) translate(-50%, -135%)`;
        }
      });
    };

    reencuadrar();
    tick();

    const ro = new ResizeObserver(reencuadrar);
    ro.observe(host);

    ctxRef.current = {
      marcadores: new Map(),
      grupoMarcadores,
      planoTermico,
      shed,
      entorno,
      irAVista,
      reencuadrar,
    };

    return () => {
      cancelado = true;
      entorno.userData.muerto = true;
      obs.disconnect();
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mt = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mt)) mt.forEach((x) => x.dispose());
        else mt?.dispose();
      });
      const matPlano = planoTermico.material as THREE.MeshBasicMaterial;
      matPlano.map?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      ctxRef.current = null;
    };
  }, []);

  // Actualizar dimensiones del galpón, textura IDW y esferas 3D de sensores
  useEffect(() => {
    const c = ctxRef.current;
    if (!c) return;

    const sx = dimensiones.ancho / ANCHO_BASE;
    const sz = dimensiones.largo / LARGO_BASE;

    c.shed.scale.set(sx, 1, sz);
    c.entorno.scale.set(Math.max(1, sx), 1, Math.max(1, sz));
    c.planoTermico.scale.set(sx, sz, 1);

    const matPlano = c.planoTermico.material as THREE.MeshBasicMaterial;
    matPlano.map?.dispose();
    matPlano.map = construirTexturaTermica({
      anchoMetros: dimensiones.ancho,
      largoMetros: dimensiones.largo,
      puntos: puntosActivos,
      zonas,
      mostrarCuadricula: modoEdicion,
    });
    matPlano.needsUpdate = true;

    const ids = new Set(puntosActivos.map((p) => p.id));
    c.marcadores.forEach((mesh, id) => {
      if (!ids.has(id)) {
        c.grupoMarcadores.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        c.marcadores.delete(id);
      }
    });

    puntosActivos.forEach((punto) => {
      let mesh = c.marcadores.get(punto.id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 16, 12),
          new THREE.MeshStandardMaterial({ color: C.verde, roughness: 0.35 }),
        );
        mesh.castShadow = true;
        c.grupoMarcadores.add(mesh);
        c.marcadores.set(punto.id, mesh);
      }
      mesh.position.set(punto.x, Math.max(0.4, punto.altura), punto.z);
      mesh.userData.punto = punto;
      const falla = esSensorTermicoConFalla(punto);
      (mesh.material as THREE.MeshStandardMaterial).color.setHex(
        falla
          ? 0xd97706
          : punto.id === sensorSeleccionadoId
            ? C.dorado
            : C.verde,
      );
    });
  }, [dimensiones, puntosActivos, zonas, modoEdicion, sensorSeleccionadoId]);

  const sensorSeleccionado =
    puntosEditados.find((p) => p.id === sensorSeleccionadoId) ?? null;

  function handleAplicarLocal() {
    setModoEdicion(false);
    onGuardado?.();
    toast.success("Vista y calibración térmica aplicadas en el plano 3D.");
  }

  function handleCancelarEdicion() {
    setDimensiones({ ancho: anchoInicial, largo: largoInicial });
    setPuntosEditados(puntosBase);
    setSensorSeleccionadoId(null);
    setModoEdicion(false);
  }

  return (
    <section className={`mt-contenedor${termico ? "" : " mt-contenedor--sin-termico"}`} aria-label="Mapa térmico 3D del galpón">
      <div className="mt-barra">
        <div className="mt-grupo" role="group" aria-label="Vista de cámara">
          <button
            type="button"
            className={`mt-btn ${vista === "superior" ? "is-activo" : ""}`}
            aria-pressed={vista === "superior"}
            onClick={() => ctxRef.current?.irAVista("superior")}
          >
            Vista superior
          </button>
          <button
            type="button"
            className={`mt-btn ${vista === "3d" ? "is-activo" : ""}`}
            aria-pressed={vista === "3d"}
            onClick={() => ctxRef.current?.irAVista("3d")}
          >
            Vista 3D
          </button>
        </div>

        <div className="mt-grupo" role="group" aria-label="Zoom">
          <button
            type="button"
            className="mt-btn mt-btn--zoom"
            aria-label="Acercar"
            onClick={() => zoomRef.current?.(0.8)}
          >
            +
          </button>
          <button
            type="button"
            className="mt-btn mt-btn--zoom"
            aria-label="Alejar"
            onClick={() => zoomRef.current?.(1.25)}
          >
            −
          </button>
        </div>

        <button
          type="button"
          className={`mt-btn mt-btn--termico${termico ? " is-activo" : ""}`}
          aria-pressed={termico}
          title="Activar o desactivar el mapa de calor"
          onClick={() => setTermico((v) => !v)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
          </svg>
          Mapa de calor
        </button>

        {import.meta.env.DEV && (
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

        {puedeEditar && (
          <div className="mt-grupo">
            {!modoEdicion ? (
              <button
                type="button"
                className="mt-btn mt-btn--edicion"
                onClick={() => setModoEdicion(true)}
              >
                Modo edición
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="mt-btn mt-btn--edicion is-activo"
                  onClick={handleAplicarLocal}
                >
                  Aplicar vista
                </button>
                <button
                  type="button"
                  className="mt-btn"
                  onClick={handleCancelarEdicion}
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-visor" ref={visorRef}>
        <div className="mt-hud">
          <div className="mt-metrica">
            <span className="mt-metrica__valor">
              {metricas.promedio === null
                ? "Sin lectura"
                : `${metricas.promedio.toFixed(1)} °C`}
            </span>
            <span className="mt-metrica__etiqueta">Promedio</span>
          </div>
          <div className="mt-metrica">
            <span className="mt-metrica__valor">
              {metricas.porcentajeRango === null
                ? "—"
                : `${metricas.porcentajeRango} %`}
            </span>
            <span className="mt-metrica__etiqueta">En rango</span>
          </div>
          <div className="mt-metrica mt-metrica--lote">
            <span className="mt-metrica__valor">
              {galpon.nombre}
            </span>
            <span className="mt-metrica__etiqueta">{galpon.loteEnCurso ? `Lote ${galpon.loteEnCurso.codigo} · ${galponVivo?.diaVida ?? 1} d` : "Sin lote activo"}</span>
          </div>
        </div>

        {puntosActivos.map((punto) => {
          const falla = esSensorTermicoConFalla(punto);
          return (
            <div
              key={punto.id}
              ref={(el) => {
                if (el) badgesRef.current.set(punto.id, el);
                else badgesRef.current.delete(punto.id);
              }}
              className={`mt-badge ${falla ? "mt-badge--falla" : ""}`}
            >
              <span className="mt-badge__nombre">{punto.codigo}</span>
              <span className="mt-badge__valor">
                {falla
                  ? "Sin señal"
                  : `${(punto.valor as number).toFixed(1)} °C`}
              </span>
              {falla && galpon.loteEnCurso && onIrABitacora && (
                <button
                  type="button"
                  className="mt-badge__accion"
                  onClick={() => onIrABitacora(galpon.loteEnCurso!.id)}
                >
                  Bitácora
                </button>
              )}
            </div>
          );
        })}

        {modoEdicion && (
          <div className="mt-aviso">
            Arrastra un sensor en el plano para ajustar su ubicación.
          </div>
        )}
        {puntosActivos.length === 0 && (
          <div className="mt-aviso mt-aviso--centro">
            Este galpón aún no tiene sensores registrados.
          </div>
        )}

        <div className="mt-leyenda" aria-hidden="true">
          <div className="mt-leyenda__barra" />
          <div className="mt-leyenda__ejes">
            <span>Frío</span>
            <span>Óptimo</span>
            <span>Crítico</span>
          </div>
        </div>
      </div>

      {puedeEditar && modoEdicion && (
        <aside
          className="mt-panel-edicion"
          aria-label="Calibración visual del galpón"
        >
          <div className="mt-panel-grid">
            <label className="mt-campo">
              <span>
                Largo (Z): <strong>{dimensiones.largo} m</strong>
              </span>
              <input
                type="range"
                min={15}
                max={60}
                step={1}
                value={dimensiones.largo}
                onChange={(e) =>
                  setDimensiones((d) => ({
                    ...d,
                    largo: Number(e.target.value),
                  }))
                }
              />
            </label>

            <label className="mt-campo">
              <span>
                Ancho (X): <strong>{dimensiones.ancho} m</strong>
              </span>
              <input
                type="range"
                min={8}
                max={24}
                step={0.5}
                value={dimensiones.ancho}
                onChange={(e) =>
                  setDimensiones((d) => ({
                    ...d,
                    ancho: Number(e.target.value),
                  }))
                }
              />
            </label>
          </div>

          {sensorSeleccionado && (
            <div className="mt-editor-sensor">
              <span>
                <strong>{sensorSeleccionado.codigo}</strong> ·{" "}
                {zonaPorCoordenadaZ(sensorSeleccionado.z, dimensiones.largo)} ·
                X: {sensorSeleccionado.x} m, Z: {sensorSeleccionado.z} m
              </span>
              <label className="mt-campo">
                <span>
                  Altura (Y):{" "}
                  <strong>{sensorSeleccionado.altura.toFixed(1)} m</strong>
                </span>
                <input
                  type="range"
                  min={0.4}
                  max={3.5}
                  step={0.1}
                  value={sensorSeleccionado.altura}
                  onChange={(e) => {
                    const nuevaY = Number(e.target.value);
                    setPuntosEditados((prev) =>
                      prev.map((p) =>
                        p.id === sensorSeleccionado.id
                          ? { ...p, altura: nuevaY }
                          : p,
                      ),
                    );
                  }}
                />
              </label>
            </div>
          )}
        </aside>
      )}
    </section>
  );
}
