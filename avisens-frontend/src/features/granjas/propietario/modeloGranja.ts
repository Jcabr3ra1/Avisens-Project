import { Box3, Color, Group, Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { fusionarPorMaterial } from '@features/dashboard/components/escena/modeloGalpon'

const RUTA_GRANJA = `${import.meta.env.BASE_URL}modelos/granja-colombiana-low-poly.glb`
const SATURACION = 0.94
const HUELLAS = ['casa', 'galpon', 'bodega', 'tanque_agua', 'huerta'] as const
const MARCO = ['casa', 'techo_casa', 'galpon', 'bodega'] as const

export type Huella = { nombre: string; x: number; z: number; ancho: number; fondo: number }

export type GranjaCargada = {
  modelo: Group
  centro: Vector3
  tamano: Vector3
  marco: Box3
  huellas: Huella[]
  suelo: number
  colorCamino: Color
  colorPasto: Color
  arboles: Object3D[]
}

let pendiente: Promise<GranjaCargada | null> | null = null

function cajaDe(escena: Object3D, nombres: readonly string[]): Box3 {
  const caja = new Box3()
  nombres.forEach((nombre) => {
    const nodo = escena.getObjectByName(nombre)
    if (nodo) caja.union(new Box3().setFromObject(nodo))
  })
  return caja
}

function atenuarSaturacion(modelo: Group): Color {
  const hsl = { h: 0, s: 0, l: 0 }
  let camino = new Color(0xc8693a)
  modelo.traverse((parte) => {
    if (!(parte instanceof Mesh) || !(parte.material instanceof MeshStandardMaterial)) return
    parte.material.color.getHSL(hsl)
    parte.material.color.setHSL(hsl.h, hsl.s * SATURACION, hsl.l)
    if (parte.material.name === 'tierra_camino') camino = parte.material.color.clone()
  })
  return camino
}

export function cargarModeloGranja(): Promise<GranjaCargada | null> {
  pendiente ??= new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .loadAsync(RUTA_GRANJA)
    .then((gltf) => {
      gltf.scene.updateMatrixWorld(true)
      const huellas: Huella[] = HUELLAS.flatMap((nombre) => {
        const caja = cajaDe(gltf.scene, [nombre])
        if (caja.isEmpty()) return []
        const medida = caja.getSize(new Vector3())
        const medio = caja.getCenter(new Vector3())
        return [{ nombre, x: medio.x, z: medio.z, ancho: medida.x, fondo: medida.z }]
      })
      const marco = cajaDe(gltf.scene, MARCO)
      const plataforma = gltf.scene.getObjectByName('terreno')
      let colorPasto = new Color(0x4f9a2a)
      plataforma?.traverse((parte) => {
        if (parte instanceof Mesh && parte.material instanceof MeshStandardMaterial) colorPasto = parte.material.color.clone()
      })
      plataforma?.removeFromParent()
      const arboles = (gltf.scene.getObjectByName('arboles')?.children ?? []).map((arbol) => arbol.clone(true))
      const modelo = fusionarPorMaterial(gltf.scene)
      const caja = new Box3().setFromObject(modelo)
      const tamano = caja.getSize(new Vector3())
      if (tamano.y <= 0) return null
      const colorCamino = atenuarSaturacion(modelo)
      return { modelo, centro: caja.getCenter(new Vector3()), tamano, marco, huellas, suelo: 0, colorCamino, colorPasto, arboles }
    })
    .catch(() => null)
  return pendiente
}
