import { Box3, Group, Mesh, Texture, Vector3, type BufferGeometry, type Material, type Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

const RUTA_POLLO = `${import.meta.env.BASE_URL}modelos/pollo-cgtrader-blanco.glb`

let pendiente: Promise<Group | null> | null = null

function normalizarPollo(modelo: Object3D): Group | null {
  const caja = new Box3().setFromObject(modelo)
  const tamano = caja.getSize(new Vector3())
  if (tamano.y <= 0) return null
  const centro = caja.getCenter(new Vector3())
  const unidad = 1 / tamano.y
  modelo.scale.setScalar(unidad)
  modelo.position.set(-centro.x * unidad, -caja.min.y * unidad, -centro.z * unidad)
  const pivote = new Group()
  pivote.add(modelo)
  return pivote
}

export function cargarModeloPollo(): Promise<Group | null> {
  pendiente ??= new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .loadAsync(RUTA_POLLO)
    .then((gltf) => normalizarPollo(gltf.scene))
    .catch(() => null)
  return pendiente
}

export function liberarPollo(raiz: Object3D) {
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
