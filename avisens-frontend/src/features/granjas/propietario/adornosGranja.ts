import {
  AdditiveBlending,
  CanvasTexture,
  CircleGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  Sprite,
  SpriteMaterial,
  Texture,
} from 'three'
import type { FaseDelDia } from '@features/dashboard/model/escenaGalpon'
import type { GranjaCargada } from './modeloGranja'

type Punto = readonly [number, number, number]

const VENTANAS: Punto[] = [[-4.2, 2.3, 2.3], [1.2, 2.3, 2.3], [5.3, 2.3, 2.3]]
const FAROLES: Punto[] = [[-4.6, 3.1, 4.8], [4.6, 3.1, 4.8]]

const LUZ_POR_FASE: Record<FaseDelDia, number> = { dia: 0, amanecer: 0.22, tarde: 0.5, noche: 1 }

function texturaRadial(colores: [number, string][]): CanvasTexture {
  const lienzo = document.createElement('canvas')
  lienzo.width = 128
  lienzo.height = 128
  const contexto = lienzo.getContext('2d')
  if (contexto) {
    const degradado = contexto.createRadialGradient(64, 64, 0, 64, 64, 64)
    colores.forEach(([parada, color]) => degradado.addColorStop(parada, color))
    contexto.fillStyle = degradado
    contexto.fillRect(0, 0, 128, 128)
  }
  return new CanvasTexture(lienzo)
}

export type AdornosGranja = {
  grupo: Group
  aplicarFase: (fase: FaseDelDia) => void
  liberar: () => void
}

export function crearAdornos(granja: GranjaCargada): AdornosGranja {
  const grupo = new Group()
  const texturas: Texture[] = []
  const desplazar = (punto: Punto): [number, number, number] => [
    granja.centro.x + punto[0],
    granja.suelo + 0.9 + punto[1],
    granja.centro.z + punto[2],
  ]

  const mascara = texturaRadial([[0, '#fff'], [0.5, '#fff'], [0.78, '#777'], [1, '#000']])
  texturas.push(mascara)
  const pradera = new Mesh(
    new CircleGeometry(1, 72),
    new MeshStandardMaterial({ color: granja.pasto, alphaMap: mascara, transparent: true, depthWrite: false, roughness: 1 }),
  )
  pradera.rotation.x = -Math.PI / 2
  pradera.scale.set(granja.tamano.x * 0.63, granja.tamano.z * 0.74, 1)
  pradera.position.set(granja.centro.x, granja.suelo + 0.12, granja.centro.z)
  pradera.receiveShadow = true
  grupo.add(pradera)

  const brillo = texturaRadial([[0, 'rgba(255, 232, 170, 1)'], [0.3, 'rgba(255, 196, 110, 0.55)'], [1, 'rgba(255, 170, 70, 0)']])
  texturas.push(brillo)
  const materialBrillo = new SpriteMaterial({ map: brillo, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })
  const focos: PointLight[] = []
  const poner = (puntos: Punto[], tamano: number, luz?: number) => {
    puntos.forEach((punto) => {
      const destello = new Sprite(materialBrillo)
      destello.scale.setScalar(tamano)
      destello.position.set(...desplazar(punto))
      grupo.add(destello)
    })
    if (luz) {
      const centro = puntos.reduce((suma, punto) => [suma[0] + punto[0], suma[1] + punto[1], suma[2] + punto[2]], [0, 0, 0])
      const foco = new PointLight(0xffc477, 0, 8, 1.8)
      foco.userData.fuerza = luz
      foco.position.set(...desplazar([centro[0] / puntos.length, centro[1] / puntos.length, centro[2] / puntos.length + 1.2]))
      grupo.add(foco)
      focos.push(foco)
    }
  }
  poner(VENTANAS, 2.2, 28)
  poner(FAROLES, 2.6)

  return {
    grupo,
    aplicarFase: (fase) => {
      const nivel = LUZ_POR_FASE[fase]
      materialBrillo.opacity = nivel * 0.5
      focos.forEach((foco) => { foco.intensity = (foco.userData.fuerza as number) * nivel })
    },
    liberar: () => {
      pradera.geometry.dispose()
      ;(pradera.material as MeshStandardMaterial).dispose()
      materialBrillo.dispose()
      texturas.forEach((textura) => textura.dispose())
      focos.forEach((foco) => foco.dispose())
    },
  }
}
