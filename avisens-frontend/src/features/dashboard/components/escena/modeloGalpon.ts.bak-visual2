import {
  Box3,
  BoxGeometry,
  Color,
  Float32BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  Texture,
  Vector3,
  type Object3D,
  type WebGLProgramParametersWithUniforms,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const BASE = `${import.meta.env.BASE_URL}modelos/`
const ARCHIVO_GALPON = 'galpon_low_poly mejorado.glb'
const ARBOLES = ['arbol-1', 'arbol-3', 'arbol-4']
const PASTOS = ['pasto-1', 'pasto-2']
const HOLGURA = 1.4

export type GalponCargado = {
  modelo: Group
  escenario: Group
  caja: Box3
  centro: Vector3
  tamano: Vector3
  radioBase: number
}

let pendiente: Promise<GalponCargado | null> | null = null

function aleatorio(semilla: number) {
  let estado = semilla
  return () => {
    estado = (estado + 0x6d2b79f5) | 0
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const NERVADURAS: Record<string, number> = { techo_verde: 0.1, cortina_amarilla: 0.08, muro_crema: 0.03 }

function darDetalle(material: MeshStandardMaterial) {
  const nervaduras = NERVADURAS[material.name] ?? 0
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uNervaduras = { value: nervaduras }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vModelo;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvModelo = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vModelo;
uniform float uNervaduras;
float azar(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float ruido(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(azar(i), azar(i + vec3(1, 0, 0)), f.x), mix(azar(i + vec3(0, 1, 0)), azar(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(azar(i + vec3(0, 0, 1)), azar(i + vec3(1, 0, 1)), f.x), mix(azar(i + vec3(0, 1, 1)), azar(i + vec3(1, 1, 1)), f.x), f.y),
    f.z
  );
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float variacion = 0.88 + 0.24 * ruido(vModelo * 0.38);
variacion *= 0.95 + 0.1 * ruido(vModelo * 2.4);
float lamina = abs(sin(vModelo.z * 5.0));
variacion *= 1.0 - uNervaduras * smoothstep(0.6, 1.0, lamina);
variacion *= mix(0.78, 1.0, smoothstep(0.0, 2.2, vModelo.y));
diffuseColor.rgb *= variacion;`)
  }
  material.customProgramCacheKey = () => 'detalle-' + material.name
  material.needsUpdate = true
}

export function fusionarPorMaterial(raiz: Object3D): Group {
  raiz.updateWorldMatrix(true, true)
  const grupos = new Map<Material, BufferGeometry[]>()
  raiz.traverse((objeto) => {
    if (!(objeto instanceof Mesh) || Array.isArray(objeto.material)) return
    const geometria = objeto.geometry.index ? objeto.geometry.toNonIndexed() : objeto.geometry.clone()
    geometria.applyMatrix4(objeto.matrixWorld)
    const color = geometria.getAttribute('color')
    if (color && color.itemSize !== 3) {
      const tres = new Float32Array(color.count * 3)
      for (let indice = 0; indice < color.count; indice++) {
        tres[indice * 3] = color.getX(indice)
        tres[indice * 3 + 1] = color.getY(indice)
        tres[indice * 3 + 2] = color.getZ(indice)
      }
      geometria.setAttribute('color', new Float32BufferAttribute(tres, 3))
    }
    const lista = grupos.get(objeto.material) ?? []
    lista.push(geometria)
    grupos.set(objeto.material, lista)
  })
  const resultado = new Group()
  grupos.forEach((geometrias, material) => {
    if (geometrias.some((geometria) => geometria.getAttribute('color'))) {
      geometrias.forEach((geometria) => {
        if (geometria.getAttribute('color')) return
        const blancos = new Float32Array(geometria.getAttribute('position').count * 3).fill(1)
        geometria.setAttribute('color', new Float32BufferAttribute(blancos, 3))
      })
      if (material instanceof MeshStandardMaterial) material.vertexColors = true
    }
    const fusionada = mergeGeometries(geometrias, false)
    geometrias.forEach((geometria) => geometria.dispose())
    if (!fusionada) return
    if (material instanceof MeshStandardMaterial) {
      material.metalness = Math.min(material.metalness, 0.15)
      material.roughness = Math.max(material.roughness, 0.7)
      darDetalle(material)
    }
    const malla = new Mesh(fusionada, material)
    malla.castShadow = !material.transparent
    malla.receiveShadow = true
    resultado.add(malla)
  })
  return resultado
}

function sombreable(modelo: Object3D): Object3D {
  modelo.traverse((parte) => {
    if (!(parte instanceof Mesh)) return
    const material = parte.material
    if (material instanceof MeshStandardMaterial) {
      const natural = material.clone()
      natural.metalness = 0
      natural.roughness = 0.92
      natural.flatShading = true
      if (natural.name === 'leafsGreen' || natural.name === 'grass') natural.color.multiply(new Color(natural.name === 'grass' ? 0.46 : 0.38, natural.name === 'grass' ? 0.58 : 0.52, natural.name === 'grass' ? 0.28 : 0.3))
      parte.material = natural
    }
    parte.castShadow = true
    parte.receiveShadow = true
  })
  return modelo
}

function apoyado(modelo: Object3D, alto: number): Group {
  const caja = new Box3().setFromObject(modelo)
  const tamano = caja.getSize(new Vector3())
  const centro = caja.getCenter(new Vector3())
  const unidad = tamano.y > 0 ? alto / tamano.y : 1
  modelo.scale.setScalar(unidad)
  modelo.position.set(-centro.x * unidad, -caja.min.y * unidad, -centro.z * unidad)
  const pivote = new Group()
  pivote.add(modelo)
  return pivote
}

async function cargarOpcional(cargador: GLTFLoader, nombre: string): Promise<Object3D | null> {
  try {
    return (await cargador.loadAsync(`${BASE}${nombre}.glb`)).scene
  } catch {
    return null
  }
}

function crearIsla(radio: number, azar: () => number): Mesh {
  const alto = radio * 0.62
  const forma = new CylinderGeometry(radio, radio * 0.12, alto, 30, 4, false)
  const posiciones = forma.getAttribute('position')
  const ruido = (x: number, z: number, nivel: number) => Math.sin(x * 1.7 + nivel * 3.1) * Math.cos(z * 1.3 - nivel * 2.3) * 0.5 + 0.5
  for (let indice = 0; indice < posiciones.count; indice++) {
    const x = posiciones.getX(indice)
    const y = posiciones.getY(indice)
    const z = posiciones.getZ(indice)
    const nivel = (alto / 2 - y) / alto
    const borde = Math.hypot(x, z)
    if (borde < 0.001) continue
    const sacudida = 1 + (ruido(x, z, nivel) - 0.5) * (nivel === 0 ? 0.07 : 0.34)
    posiciones.setXYZ(indice, x * sacudida, y - (nivel > 0 && nivel < 1 ? ruido(z, x, nivel) * alto * 0.12 : 0), z * sacudida)
  }
  const caras = forma.toNonIndexed()
  forma.dispose()
  caras.translate(0, -alto / 2 - 0.02, 0)
  const puntos = caras.getAttribute('position')
  const normales = caras.getAttribute('normal')
  const colores = new Float32Array(puntos.count * 3)
  const pasto = new Color()
  const tierra = new Color()
  for (let cara = 0; cara < puntos.count; cara += 3) {
    const arriba = (normales.getY(cara) + normales.getY(cara + 1) + normales.getY(cara + 2)) / 3 > 0.85
    const altura = (puntos.getY(cara) + puntos.getY(cara + 1) + puntos.getY(cara + 2)) / 3
    const variacion = (azar() - 0.5) * 0.1
    if (arriba) pasto.setHSL(0.27, 0.5, 0.4 + variacion)
    else tierra.setHSL(0.075 - (altura / alto) * 0.02, 0.24, Math.max(0.18, 0.36 + variacion + altura / alto * 0.24))
    const color = arriba ? pasto : tierra
    for (let vertice = 0; vertice < 3; vertice++) {
      colores[(cara + vertice) * 3] = color.r
      colores[(cara + vertice) * 3 + 1] = color.g
      colores[(cara + vertice) * 3 + 2] = color.b
    }
  }
  caras.setAttribute('color', new Float32BufferAttribute(colores, 3))
  const isla = new Mesh(caras, new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }))
  isla.receiveShadow = true
  isla.castShadow = true
  return isla
}

function armarEscenario(tamano: Vector3, arboles: Object3D[], pastos: Object3D[]): { grupo: Group; radio: number } {
  const radio = Math.hypot(tamano.x / 2, tamano.z / 2) * 1.2
  const grupo = new Group()
  const azar = aleatorio(7)

  grupo.add(crearIsla(radio, azar))

  const camino = new Mesh(
    new BoxGeometry(3.4, 0.05, radio - tamano.z / 2 + HOLGURA),
    new MeshStandardMaterial({ color: 0xcdb98f, roughness: 1, flatShading: true }),
  )
  camino.position.set(0, 0.01, tamano.z / 2 + (radio - tamano.z / 2 + HOLGURA) / 2 - HOLGURA / 2)
  camino.receiveShadow = true
  grupo.add(camino)

  const dentro = (x: number, z: number, margen: number) =>
    Math.abs(x) < tamano.x / 2 + margen && Math.abs(z) < tamano.z / 2 + margen
  const enCamino = (x: number, z: number) => Math.abs(x) < 3.2 && z > 0

  if (arboles.length > 0) {
    const angulos = [-2.9, -2.55, -2.2, -1.85, -1.5, -1.15, -0.8, 0.8, 1.15, 1.5, 1.85, 2.2, 2.55, 2.9, 3.14]
    angulos.forEach((angulo, indice) => {
      let distancia = radio * (0.5 + azar() * 0.08)
      while (distancia < radio * 0.8 && dentro(Math.sin(angulo) * distancia, Math.cos(angulo) * distancia, 3.4)) distancia += 0.5
      const x = Math.sin(angulo) * distancia
      const z = Math.cos(angulo) * distancia
      if (dentro(x, z, 3.4) || enCamino(x, z)) return
      const arbol = apoyado(arboles[indice % arboles.length].clone(true), 4.6 + azar() * 2.6)
      arbol.position.set(x, 0, z)
      arbol.rotation.y = azar() * Math.PI * 2
      grupo.add(arbol)
    })
  }

  if (pastos.length > 0) {
    const grupos = [-2.9, -2.4, -1.9, -1.4, -0.7, 0.3, 0.9, 1.5, 2.1, 2.6, 3.1]
    let colocados = 0
    grupos.forEach((angulo, indice) => {
      const distancia = radio * (0.46 + (indice % 3) * 0.1)
      const cx = Math.sin(angulo) * distancia
      const cz = Math.cos(angulo) * distancia
      for (let mata = 0; mata < 4; mata++) {
        const x = cx + (azar() - 0.5) * 3.2
        const z = cz + (azar() - 0.5) * 3.2
        if (dentro(x, z, 1.4) || enCamino(x, z) || Math.hypot(x, z) > radio * 0.82) continue
        const tuft = apoyado(pastos[colocados % pastos.length].clone(true), 0.7 + azar() * 0.5)
        tuft.position.set(x, 0, z)
        tuft.rotation.y = azar() * Math.PI * 2
        grupo.add(tuft)
        colocados++
      }
    })
  }

  return { grupo, radio }
}

export function cargarModeloGalpon(): Promise<GalponCargado | null> {
  pendiente ??= (async () => {
    const cargador = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    try {
      const [gltf, ...extras] = await Promise.all([
        cargador.loadAsync(`${BASE}${encodeURIComponent(ARCHIVO_GALPON)}`),
        ...[...ARBOLES, ...PASTOS].map((nombre) => cargarOpcional(cargador, nombre)),
      ])
      const modelo = fusionarPorMaterial(gltf.scene)
      const caja = new Box3().setFromObject(modelo)
      const tamano = caja.getSize(new Vector3())
      if (tamano.y <= 0) return null
      const centro = caja.getCenter(new Vector3())
      const hallados = extras.filter((extra): extra is Object3D => extra !== null).map(sombreable)
      const arboles = hallados.slice(0, extras.slice(0, ARBOLES.length).filter(Boolean).length)
      const pastos = hallados.slice(arboles.length)
      const { grupo, radio } = armarEscenario(tamano, arboles, pastos)
      return { modelo, escenario: grupo, caja, centro, tamano, radioBase: radio }
    } catch {
      return null
    }
  })()
  return pendiente
}

export function liberarGalpon(raiz: Object3D) {
  const geometrias = new Set<BufferGeometry>()
  const materiales = new Set<Material>()
  const texturas = new Set<Texture>()
  raiz.traverse((objeto) => {
    if (!(objeto instanceof Mesh)) return
    geometrias.add(objeto.geometry)
    const lista = Array.isArray(objeto.material) ? objeto.material : [objeto.material]
    lista.forEach((material) => {
      materiales.add(material)
      Object.values(material).forEach((valor) => {
        if (valor instanceof Texture) texturas.add(valor)
      })
    })
  })
  geometrias.forEach((geometria) => geometria.dispose())
  texturas.forEach((textura) => textura.dispose())
  materiales.forEach((material) => material.dispose())
}
