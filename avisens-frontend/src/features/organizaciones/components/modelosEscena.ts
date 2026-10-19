import { Box3, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Vector3, type BufferGeometry, type Material, type Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { GALPON } from '../model/maqueta'

export interface GalponModelo {
  activo: Object3D
  inactivo: Object3D
  alto: number
}

export interface PastoModelo {
  geometria: BufferGeometry
  material: Material
}

export interface ModelosEscena {
  arboles: Object3D[]
  galpon: GalponModelo | null
  pasto: PastoModelo[]
  gallina: Object3D | null
}

export const CREDITO_GALLINA = {
  texto: 'Gallina 3D: Tiberiu Uncu · CC BY 4.0',
  enlace: 'https://sketchfab.com/3d-models/low-poly-chicken-29e61a713bd3413c8fc74c8453a1ada1',
}

const ALTO_GALLINA = 0.32

const PASTOS = Array.from({ length: 4 }, (_, indice) => `pasto-${indice + 1}`)
const ESCALA_PASTO = 1.0

const TECHO_ACTIVO = '#1f6e50'
const TECHO_INACTIVO = '#97a39c'
const PAREDES_INACTIVAS = '#a9aeaa'
const HOLGURA_ANCHO_GALPON = 0.18

const ARBOLES = Array.from({ length: 6 }, (_, indice) => `arbol-${indice + 1}`)
const ALTO_ARBOL = 1.4

let pendiente: Promise<ModelosEscena> | null = null

const PALETA_ARBOLES: Array<[RegExp, string]> = [
  [/leaf.*dark|dark.*leaf/i, '#2f7a45'],
  [/leaf.*(orange|red|yellow|fall)/i, '#7fa83a'],
  [/leaf/i, '#4c9a4a'],
  [/grass/i, '#4f9c45'],
  [/bark.*dark|wood.*dark/i, '#5e4430'],
  [/bark|wood|trunk/i, '#7a5a3c'],
]

function conLuz(material: Material): Material {
  if (material instanceof MeshStandardMaterial) {
    const tono = PALETA_ARBOLES.find(([patron]) => patron.test(material.name))?.[1]
    if (tono) material.color.set(tono)
    material.metalness = 0
    material.roughness = Math.max(material.roughness, 0.85)
    material.flatShading = true
    material.needsUpdate = true
    return material
  }
  if (!(material instanceof MeshBasicMaterial)) return material
  const iluminado = new MeshStandardMaterial({
    name: material.name,
    color: material.color,
    map: material.map,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  })
  material.dispose()
  return iluminado
}

function normalizar(modelo: Object3D, alto: number): Object3D {
  const caja = new Box3().setFromObject(modelo)
  const tamano = caja.getSize(new Vector3())
  const centro = caja.getCenter(new Vector3())
  modelo.position.sub(new Vector3(centro.x, caja.min.y, centro.z))
  modelo.traverse((parte) => {
    if (parte instanceof Mesh) {
      parte.material = Array.isArray(parte.material) ? parte.material.map(conLuz) : conLuz(parte.material)
      parte.castShadow = true
      parte.receiveShadow = true
    }
  })
  const pivote = new Group()
  pivote.add(modelo)
  const escala = tamano.y > 0 ? alto / tamano.y : 1
  pivote.scale.setScalar(escala)
  pivote.userData.radio = (Math.max(tamano.x, tamano.z) / 2) * escala
  return pivote
}

function prepararGalpon(modelo: Object3D): GalponModelo {
  modelo.traverse((parte) => {
    if (parte instanceof Mesh) {
      parte.material = Array.isArray(parte.material) ? parte.material.map(conLuz) : conLuz(parte.material)
      if (parte.material instanceof MeshStandardMaterial && parte.material.name === 'techo') parte.material.color.set(TECHO_ACTIVO)
      parte.castShadow = true
      parte.receiveShadow = true
    }
  })
  const giro = new Group()
  giro.add(modelo)
  const inicial = new Box3().setFromObject(giro).getSize(new Vector3())
  if (inicial.x > inicial.z) giro.rotation.y = -Math.PI / 2
  giro.updateMatrixWorld(true)
  const caja = new Box3().setFromObject(giro)
  const tamano = caja.getSize(new Vector3())
  const centro = caja.getCenter(new Vector3())
  giro.position.sub(new Vector3(centro.x, caja.min.y, centro.z))
  const escala = Math.min(GALPON.largo / tamano.z, (GALPON.ancho + HOLGURA_ANCHO_GALPON) / tamano.x)
  const activo = new Group()
  activo.add(giro)
  activo.scale.setScalar(escala)

  const inactivo = activo.clone(true)
  inactivo.traverse((parte) => {
    if (!(parte instanceof Mesh) || !(parte.material instanceof MeshStandardMaterial)) return
    const apagado = parte.material.clone()
    apagado.color.set(apagado.name === 'techo' ? TECHO_INACTIVO : PAREDES_INACTIVAS)
    parte.material = apagado
  })
  return { activo, inactivo, alto: tamano.y * escala }
}

function prepararPasto(modelo: Object3D): PastoModelo | null {
  modelo.updateMatrixWorld(true)
  const mallas: Mesh[] = []
  modelo.traverse((parte) => {
    if (parte instanceof Mesh) mallas.push(parte)
  })
  const malla = mallas[0]
  if (!malla) return null
  const geometria = (malla.geometry as BufferGeometry).clone().applyMatrix4(malla.matrixWorld)
  const caja = new Box3().setFromBufferAttribute(geometria.getAttribute('position') as never)
  geometria.translate(-(caja.min.x + caja.max.x) / 2, -caja.min.y, -(caja.min.z + caja.max.z) / 2)
  geometria.scale(ESCALA_PASTO, ESCALA_PASTO, ESCALA_PASTO)
  return { geometria, material: conLuz(Array.isArray(malla.material) ? malla.material[0] : malla.material) }
}

async function cargar(cargador: GLTFLoader, nombre: string): Promise<Object3D | null> {
  try {
    const gltf = await cargador.loadAsync(`${import.meta.env.BASE_URL}modelos/${nombre}.glb`)
    return gltf.scene
  } catch {
    return null
  }
}

export function cargarModelosEscena(): Promise<ModelosEscena> {
  pendiente ??= (async () => {
    const cargador = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    const [galpon, gallina, ...resto] = await Promise.all(['galpon', 'gallina', ...ARBOLES, ...PASTOS].map((nombre) => cargar(cargador, nombre)))
    const arboles = resto.slice(0, ARBOLES.length)
    const pastos = resto.slice(ARBOLES.length)
    return {
      galpon: galpon ? prepararGalpon(galpon) : null,
      gallina: gallina ? normalizar(gallina, ALTO_GALLINA) : null,
      pasto: pastos
        .filter((modelo): modelo is Object3D => modelo !== null)
        .map(prepararPasto)
        .filter((pasto): pasto is PastoModelo => pasto !== null),
      arboles: arboles
        .filter((modelo): modelo is Object3D => modelo !== null)
        .map((modelo) => normalizar(modelo, ALTO_ARBOL)),
    }
  })()
  return pendiente
}
