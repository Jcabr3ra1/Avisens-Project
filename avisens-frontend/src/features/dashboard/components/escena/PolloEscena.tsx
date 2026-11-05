import { useEffect, useRef } from 'react'
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  CircleGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'
import type { Astro, FaseDelDia } from '../../model/escenaGalpon'
import { cargarModeloPollo, liberarPollo } from './modeloPollo'

export type PolloUbicado = { x: number; y: number; alto: number; giro: number }

type Props = {
  pollos: PolloUbicado[]
  region: { x: number; y: number; ancho: number; alto: number }
  escena: { ancho: number; alto: number }
  fase: FaseDelDia
  astro: Astro
}

const INCLINACION = (11 * Math.PI) / 180
const DISTANCIA_CAMARA = 1000
const PIXELES_MAXIMOS = 2

type Luz = { cielo: number; suelo: number; ambiente: number; sol: number; fuerza: number; sombra: number }

const LUCES: Record<FaseDelDia, Luz> = {
  dia: { cielo: 0xffffff, suelo: 0xc2ccbd, ambiente: 1.15, sol: 0xffffff, fuerza: 1.25, sombra: 0.34 },
  amanecer: { cielo: 0xfffaf0, suelo: 0xc4bca8, ambiente: 1.1, sol: 0xffeccf, fuerza: 1.15, sombra: 0.3 },
  tarde: { cielo: 0xfff6e8, suelo: 0xb5ab96, ambiente: 1.05, sol: 0xffe2bd, fuerza: 1.15, sombra: 0.4 },
  noche: { cielo: 0xf6f1e4, suelo: 0x8d887b, ambiente: 0.92, sol: 0xfff3dc, fuerza: 0.7, sombra: 0.5 },
}

function texturaSombra(): CanvasTexture {
  const lienzo = document.createElement('canvas')
  lienzo.width = 64
  lienzo.height = 64
  const contexto = lienzo.getContext('2d')
  if (contexto) {
    const degradado = contexto.createRadialGradient(32, 32, 2, 32, 32, 30)
    degradado.addColorStop(0, 'rgba(18, 30, 24, 1)')
    degradado.addColorStop(1, 'rgba(18, 30, 24, 0)')
    contexto.fillStyle = degradado
    contexto.fillRect(0, 0, 64, 64)
  }
  return new CanvasTexture(lienzo)
}

function PolloEscena({ pollos, region, escena, fase, astro }: Props) {
  const contenedor = useRef<HTMLSpanElement>(null)
  const ajustarLuz = useRef<((fase: FaseDelDia, astro: Astro) => void) | null>(null)
  const faseInicial = useRef({ fase, astro })
  const bandada = useRef(pollos)
  bandada.current = pollos
  const firma = pollos.map((pollo) => `${pollo.x},${pollo.y},${pollo.alto},${pollo.giro}`).join('|')

  const { tipo, x, y } = astro
  useEffect(() => {
    ajustarLuz.current?.(fase, { tipo, x, y })
  }, [fase, tipo, x, y])

  useEffect(() => {
    const caja = contenedor.current
    if (!caja || !firma) return

    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    } catch {
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, PIXELES_MAXIMOS))
    renderer.outputColorSpace = SRGBColorSpace
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 1
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.setAttribute('aria-hidden', 'true')
    caja.appendChild(renderer.domElement)

    const centroX = region.x + region.ancho / 2
    const centroY = region.y + region.alto / 2
    const mundo = new Scene()
    const camara = new OrthographicCamera(
      -region.ancho / 2, region.ancho / 2, region.alto / 2, -region.alto / 2, 1, 3000,
    )
    camara.position.set(0, Math.sin(INCLINACION) * DISTANCIA_CAMARA, Math.cos(INCLINACION) * DISTANCIA_CAMARA)
    camara.lookAt(0, 0, 0)

    const luzAmbiente = new HemisphereLight(0xffffff, 0xc2ccbd, 1)
    const luzSol = new DirectionalLight(0xffffff, 1)
    mundo.add(luzAmbiente, luzSol)

    const mapaSombra = texturaSombra()
    const materialSombra = new MeshBasicMaterial({ map: mapaSombra, transparent: true, depthWrite: false })
    const geometriaSombra = new CircleGeometry(1, 24)

    const grupo = new Group()
    mundo.add(grupo)
    let modelo: Group | null = null
    let cancelado = false

    const dibujar = () => renderer.render(mundo, camara)

    const iluminar = (nuevaFase: FaseDelDia, nuevoAstro: Astro) => {
      const luz = LUCES[nuevaFase]
      luzAmbiente.color.set(luz.cielo)
      luzAmbiente.groundColor.set(luz.suelo)
      luzAmbiente.intensity = luz.ambiente
      luzSol.color.set(luz.sol)
      luzSol.intensity = luz.fuerza
      luzSol.position.set(((nuevoAstro.x - 50) / 50) * 140, 160, 120)
      materialSombra.opacity = luz.sombra
      dibujar()
    }
    ajustarLuz.current = iluminar

    const ubicar = (base: Group) => {
      bandada.current.forEach((pollo, indice) => {
        const copia = indice === 0 ? base : base.clone(true)
        copia.scale.setScalar(pollo.alto)
        copia.rotation.y = pollo.giro
        const posX = pollo.x - centroX
        const posZ = (pollo.y - centroY) / Math.sin(INCLINACION)
        copia.position.set(posX, 0, posZ)
        const sombra = new Mesh(geometriaSombra, materialSombra)
        sombra.rotation.x = -Math.PI / 2
        sombra.scale.set(pollo.alto * 0.62, pollo.alto * 0.34, 1)
        sombra.position.set(posX, 0.05, posZ)
        grupo.add(sombra, copia)
      })
    }

    const encuadrar = () => {
      const ancho = caja.clientWidth
      const alto = caja.clientHeight
      if (!ancho || !alto) return
      renderer.setSize(ancho, alto, false)
      dibujar()
    }
    const observador = new ResizeObserver(encuadrar)
    observador.observe(caja)

    void cargarModeloPollo().then((pollo) => {
      if (cancelado || !pollo) return
      modelo = pollo
      ubicar(pollo)
      iluminar(faseInicial.current.fase, faseInicial.current.astro)
    })

    iluminar(faseInicial.current.fase, faseInicial.current.astro)
    encuadrar()

    return () => {
      cancelado = true
      ajustarLuz.current = null
      observador.disconnect()
      if (modelo) liberarPollo(modelo)
      grupo.clear()
      geometriaSombra.dispose()
      materialSombra.dispose()
      mapaSombra.dispose()
      luzAmbiente.dispose()
      luzSol.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [firma, region.x, region.y, region.ancho, region.alto])

  return (
    <span
      ref={contenedor}
      className="escena-pollo"
      aria-hidden="true"
      style={{
        left: `${((region.x / escena.ancho) * 100).toFixed(3)}%`,
        top: `${((region.y / escena.alto) * 100).toFixed(3)}%`,
        width: `${((region.ancho / escena.ancho) * 100).toFixed(3)}%`,
        height: `${((region.alto / escena.alto) * 100).toFixed(3)}%`,
      }}
    />
  )
}

export default PolloEscena
