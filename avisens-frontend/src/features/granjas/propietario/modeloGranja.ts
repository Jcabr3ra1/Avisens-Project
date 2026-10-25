import { Box3, Color, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { fusionarPorMaterial } from '@features/dashboard/components/escena/modeloGalpon'

const RUTA_GRANJA = `${import.meta.env.BASE_URL}modelos/granja-colombiana-low-poly.glb`

export type GranjaCargada = { modelo: Group; centro: Vector3; tamano: Vector3; radio: number; pasto: Color; suelo: number }

let pendiente: Promise<GranjaCargada | null> | null = null

export function cargarModeloGranja(): Promise<GranjaCargada | null> {
  pendiente ??= new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .loadAsync(RUTA_GRANJA)
    .then((gltf) => {
      const modelo = fusionarPorMaterial(gltf.scene)
      const caja = new Box3().setFromObject(modelo)
      const tamano = caja.getSize(new Vector3())
      if (tamano.y <= 0) return null
      const centro = caja.getCenter(new Vector3())
      let pasto = new Color(0x78b43a)
      modelo.traverse((parte) => {
        if (parte instanceof Mesh && parte.material instanceof MeshStandardMaterial && parte.material.name === 'pasto') {
          pasto = parte.material.color.clone()
        }
      })
      return { modelo, centro, tamano, radio: Math.hypot(tamano.x, tamano.z) / 2, pasto, suelo: caja.min.y }
    })
    .catch(() => null)
  return pendiente
}
