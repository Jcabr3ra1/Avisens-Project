import {
  AdditiveBlending,
  BufferAttribute,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
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

const ANCHO_TERRENO = 260
const FONDO_TERRENO = 120
const SEGMENTOS_X = 52
const SEGMENTOS_Z = 24
const CENTRO_Z = -26
const ELEVACION_LOMAS = 3.5

function suavizar(minimo: number, maximo: number, valor: number): number {
  const t = Math.min(1, Math.max(0, (valor - minimo) / (maximo - minimo)))
  return t * t * (3 - 2 * t)
}

function azar(x: number, z: number): number {
  const valor = Math.sin(x * 127.1 + z * 311.7) * 43758.5453
  return valor - Math.floor(valor)
}

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

function texturaDesvanecida(): CanvasTexture {
  const lado = 128
  const lienzo = document.createElement('canvas')
  lienzo.width = lado
  lienzo.height = lado
  const contexto = lienzo.getContext('2d')
  if (contexto) {
    const imagen = contexto.createImageData(lado, lado)
    for (let fila = 0; fila < lado; fila++) {
      for (let columna = 0; columna < lado; columna++) {
        const u = columna / (lado - 1)
        const v = fila / (lado - 1)
        const lateral = Math.min(suavizar(0, 0.2, u), suavizar(0, 0.2, 1 - u))
        const lejos = suavizar(0.04, 0.55, v)
        const valor = Math.round(255 * lateral * lejos)
        const indice = (fila * lado + columna) * 4
        imagen.data[indice] = valor
        imagen.data[indice + 1] = valor
        imagen.data[indice + 2] = valor
        imagen.data[indice + 3] = 255
      }
    }
    contexto.putImageData(imagen, 0, 0)
  }
  return new CanvasTexture(lienzo)
}

function texturaCamino(): CanvasTexture {
  const lienzo = document.createElement('canvas')
  lienzo.width = 32
  lienzo.height = 128
  const contexto = lienzo.getContext('2d')
  if (contexto) {
    const degradado = contexto.createLinearGradient(0, 0, 0, 128)
    degradado.addColorStop(0, '#fff')
    degradado.addColorStop(0.35, '#fff')
    degradado.addColorStop(1, '#000')
    contexto.fillStyle = degradado
    contexto.fillRect(0, 0, 32, 128)
    const borde = contexto.createLinearGradient(0, 0, 32, 0)
    borde.addColorStop(0, 'rgba(0,0,0,1)')
    borde.addColorStop(0.18, 'rgba(0,0,0,0)')
    borde.addColorStop(0.82, 'rgba(0,0,0,0)')
    borde.addColorStop(1, 'rgba(0,0,0,1)')
    contexto.fillStyle = borde
    contexto.fillRect(0, 0, 32, 128)
  }
  return new CanvasTexture(lienzo)
}

export type AdornosGranja = {
  grupo: Group
  aplicarFase: (fase: FaseDelDia) => void
  aplicarSuelo: (color: Color) => void
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

  const base = new PlaneGeometry(ANCHO_TERRENO, FONDO_TERRENO, SEGMENTOS_X, SEGMENTOS_Z)
  base.rotateX(-Math.PI / 2)
  const posicion = base.getAttribute('position') as BufferAttribute
  for (let indice = 0; indice < posicion.count; indice++) {
    const x = posicion.getX(indice)
    const z = posicion.getZ(indice) + CENTRO_Z
    const lejania = Math.hypot(x / 34, (z - 2) / 28)
    const aplanado = suavizar(1, 1.7, lejania)
    const ondulacion = (azar(Math.round(x), Math.round(z)) - 0.35) * 3.4
    const lomas = suavizar(20, 70, -z) * ELEVACION_LOMAS
    const laderas = suavizar(60, 150, Math.abs(x)) * 7
    posicion.setY(indice, (ondulacion + lomas + laderas) * aplanado)
    posicion.setZ(indice, posicion.getZ(indice))
  }
  const caras = base.toNonIndexed()
  base.dispose()
  caras.translate(granja.centro.x, granja.suelo - 0.02, granja.centro.z + CENTRO_Z)
  caras.setAttribute('color', new Float32BufferAttribute(new Float32Array(caras.getAttribute('position').count * 3), 3))

  const aplicarSuelo = (color: Color) => {
    const colores = caras.getAttribute('color') as BufferAttribute
    const puntos = caras.getAttribute('position') as BufferAttribute
    const hsl = { h: 0, s: 0, l: 0 }
    color.getHSL(hsl)
    const tono = new Color()
    for (let cara = 0; cara < puntos.count; cara += 3) {
      const altura = (puntos.getY(cara) + puntos.getY(cara + 1) + puntos.getY(cara + 2)) / 3 - granja.suelo
      const x = puntos.getX(cara)
      const z = puntos.getZ(cara)
      const variacion = (azar(Math.round(x * 3), Math.round(z * 3)) - 0.5) * 0.1
      tono.setHSL(hsl.h, hsl.s * 0.92, Math.min(0.78, Math.max(0.2, hsl.l + variacion + altura * 0.004)))
      for (let vertice = 0; vertice < 3; vertice++) colores.setXYZ(cara + vertice, tono.r, tono.g, tono.b)
    }
    colores.needsUpdate = true
  }
  aplicarSuelo(new Color(0x86a46a))
  caras.computeVertexNormals()

  const desvanecido = texturaDesvanecida()
  texturas.push(desvanecido)
  const terreno = new Mesh(
    caras,
    new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, alphaMap: desvanecido, transparent: true }),
  )
  terreno.receiveShadow = true
  terreno.renderOrder = -1
  grupo.add(terreno)

  const mascaraCamino = texturaCamino()
  texturas.push(mascaraCamino)
  const largoCamino = 30
  const camino = new Mesh(
    new PlaneGeometry(2.8, largoCamino),
    new MeshStandardMaterial({ color: granja.colorCamino, roughness: 1, alphaMap: mascaraCamino, transparent: true, depthWrite: false }),
  )
  camino.rotation.x = -Math.PI / 2
  camino.position.set(2.5, granja.suelo + 0.06, 17.6 + largoCamino / 2)
  camino.receiveShadow = true
  grupo.add(camino)

  const mancha = texturaRadial([[0, 'rgba(10, 18, 12, 0.85)'], [0.55, 'rgba(10, 18, 12, 0.4)'], [1, 'rgba(10, 18, 12, 0)']])
  texturas.push(mancha)
  const materialMancha = new MeshBasicMaterial({ map: mancha, transparent: true, depthWrite: false, opacity: 0.55, polygonOffset: true, polygonOffsetFactor: -2 })
  const manchas = granja.huellas.map((huella) => {
    const sombra = new Mesh(new PlaneGeometry(1, 1), materialMancha)
    sombra.rotation.x = -Math.PI / 2
    sombra.scale.set(huella.ancho * 1.45, huella.fondo * 1.5, 1)
    sombra.position.set(huella.x + 0.5, granja.suelo + 0.1, huella.z + 0.7)
    sombra.renderOrder = 1
    grupo.add(sombra)
    return sombra
  })

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
    aplicarSuelo,
    aplicarFase: (fase) => {
      const nivel = LUZ_POR_FASE[fase]
      materialBrillo.opacity = nivel * 0.5
      materialMancha.opacity = fase === 'noche' ? 0.4 : 0.55
      focos.forEach((foco) => { foco.intensity = (foco.userData.fuerza as number) * nivel })
    },
    liberar: () => {
      terreno.geometry.dispose()
      ;(terreno.material as MeshStandardMaterial).dispose()
      camino.geometry.dispose()
      ;(camino.material as MeshStandardMaterial).dispose()
      manchas.forEach((sombra) => sombra.geometry.dispose())
      materialMancha.dispose()
      materialBrillo.dispose()
      texturas.forEach((textura) => textura.dispose())
      focos.forEach((foco) => foco.dispose())
    },
  }
}
