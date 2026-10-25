import { useEffect, useRef, useState } from 'react'
import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  HemisphereLight,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'
import granjaImagen from '@features/dashboard/assets/escena/granja-popayan-low-poly.webp'
import { liberarGalpon } from '@features/dashboard/components/escena/modeloGalpon'
import { LUCES } from '@features/dashboard/components/escena/lucesPorFase'
import { useFaseDelDia } from '@features/dashboard/hooks/useFaseDelDia'
import { crearAdornos, type AdornosGranja } from './adornosGranja'
import { colorDelHorizonte } from './colorDelHorizonte'
import type { ClimaVisual } from './climaVisual'
import { cargarModeloGranja, type GranjaCargada } from './modeloGranja'

type Props = {
  nombre: string
  fondo: string
  clima: ClimaVisual
  posicionAstro: number
}

const ELEVACION = (12 * Math.PI) / 180
const CAMPO_VISION = 24
const MARGEN_ENCUADRE = 0.9
const FUERZA_CLIMA: Record<ClimaVisual, { sol: number; ambiente: number }> = {
  despejado: { sol: 1, ambiente: 1 },
  nublado: { sol: 0.5, ambiente: 1.08 },
  lluvia: { sol: 0.3, ambiente: 0.95 },
}

function EscenaGranja({ nombre, fondo, clima, posicionAstro }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const [sinModelo, setSinModelo] = useState(false)
  const fase = useFaseDelDia()
  const estado = useRef({ fase, clima, posicionAstro, fondo })
  estado.current = { fase, clima, posicionAstro, fondo }
  const redibujar = useRef<(() => void) | null>(null)
  const recolorear = useRef<(() => void) | null>(null)

  useEffect(() => {
    redibujar.current?.()
  }, [fase, clima, posicionAstro])

  useEffect(() => {
    recolorear.current?.()
  }, [fondo])

  useEffect(() => {
    const caja = contenedor.current
    if (!caja) return

    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    } catch {
      void Promise.resolve().then(() => setSinModelo(true))
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = SRGBColorSpace
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.9
    renderer.setClearColor(0x000000, 0)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = PCFSoftShadowMap
    renderer.shadowMap.autoUpdate = false
    renderer.domElement.setAttribute('aria-hidden', 'true')
    caja.appendChild(renderer.domElement)

    const mundo = new Scene()
    const camara = new PerspectiveCamera(CAMPO_VISION, 1, 0.1, 900)
    const ambiente = new HemisphereLight(0xf2f6fb, 0xaebca0, 1.15)
    const sol = new DirectionalLight(0xffeccb, 1.9)
    sol.castShadow = true
    sol.shadow.mapSize.set(2048, 2048)
    sol.shadow.bias = -0.0004
    sol.shadow.normalBias = 0.06
    mundo.add(ambiente, sol, sol.target)

    let granja: GranjaCargada | null = null
    let adornos: AdornosGranja | null = null
    let cancelado = false

    const zonaVisible = () => {
      const zona = caja.closest('.org-hero-escena')
      const marco = caja.getBoundingClientRect()
      if (!zona || !marco.width) return { x: 0, y: 0, ancho: caja.clientWidth, alto: caja.clientHeight }
      const rect = zona.getBoundingClientRect()
      return { x: rect.left - marco.left, y: rect.top - marco.top, ancho: rect.width, alto: rect.height }
    }

    const iluminar = () => {
      const { fase: faseActual, clima: climaActual, posicionAstro: astro } = estado.current
      const luz = LUCES[faseActual]
      const fuerza = FUERZA_CLIMA[climaActual]
      ambiente.color.set(luz.cielo)
      ambiente.groundColor.set(luz.suelo)
      ambiente.intensity = luz.ambiente * fuerza.ambiente
      sol.color.set(luz.sol)
      sol.intensity = luz.fuerza * fuerza.sol
      const lado = Math.max(-1, Math.min(1, (astro - 65) / 21))
      sol.position.set(lado * 48, luz.y * 2.2, 20 + Math.abs(luz.z) * 1.2)
      adornos?.aplicarFase(faseActual)
      renderer.shadowMap.needsUpdate = true
    }

    const dibujar = () => {
      if (!granja) return
      const ancho = caja.clientWidth
      const alto = caja.clientHeight
      if (!ancho || !alto) return
      const zona = zonaVisible()
      const desvioX = zona.x + zona.ancho / 2 - ancho / 2
      const desvioY = zona.y + zona.alto / 2 - alto / 2
      camara.setViewOffset(ancho, alto, -desvioX, -desvioY, ancho, alto)
      const objetivo = granja.marco.getCenter(new Vector3())
      objetivo.y *= 0.5
      const { min, max } = granja.marco
      const esquinas = [min.x, max.x].flatMap((x) => [min.y, max.y].flatMap((y) => [min.z, max.z].map((z) => new Vector3(x, y, z))))
      const colocar = (distancia: number) => {
        camara.position.set(
          objetivo.x,
          objetivo.y + Math.sin(ELEVACION) * distancia,
          objetivo.z + Math.cos(ELEVACION) * distancia,
        )
        camara.lookAt(objetivo)
        camara.updateMatrixWorld()
      }
      const cabe = (distancia: number) => {
        colocar(distancia)
        return esquinas.every((esquina) => {
          const punto = esquina.clone().project(camara)
          const px = ((punto.x + 1) / 2) * ancho
          const py = ((1 - punto.y) / 2) * alto
          return Math.abs(px - (zona.x + zona.ancho / 2)) <= (zona.ancho / 2) * MARGEN_ENCUADRE
            && Math.abs(py - (zona.y + zona.alto / 2)) <= (zona.alto / 2) * MARGEN_ENCUADRE
        })
      }
      let cerca = 6
      let lejos = 400
      for (let paso = 0; paso < 16; paso++) {
        const medio = (cerca + lejos) / 2
        if (cabe(medio)) lejos = medio
        else cerca = medio
      }
      colocar(lejos)
      renderer.render(mundo, camara)
    }

    redibujar.current = () => {
      iluminar()
      dibujar()
    }

    const pintarSuelo = () => {
      void colorDelHorizonte(estado.current.fondo).then((color: Color) => {
        if (cancelado) return
        adornos?.aplicarSuelo(color)
        dibujar()
      })
    }
    recolorear.current = pintarSuelo

    const encuadrar = () => {
      const ancho = caja.clientWidth
      const alto = caja.clientHeight
      if (!ancho || !alto) return
      renderer.setSize(ancho, alto, false)
      camara.aspect = ancho / alto
      camara.updateProjectionMatrix()
      dibujar()
    }
    const observador = new ResizeObserver(encuadrar)
    observador.observe(caja)

    void cargarModeloGranja().then((cargada) => {
      if (cancelado) return
      if (!cargada) {
        setSinModelo(true)
        return
      }
      granja = cargada
      mundo.add(cargada.modelo)
      adornos = crearAdornos(cargada)
      mundo.add(adornos.grupo)
      const alcance = 52
      Object.assign(sol.shadow.camera, { left: -alcance, right: alcance, top: alcance, bottom: -alcance, near: 1, far: 260 })
      sol.shadow.camera.updateProjectionMatrix()
      sol.target.position.copy(cargada.centro)
      iluminar()
      pintarSuelo()
      encuadrar()
    })

    return () => {
      cancelado = true
      redibujar.current = null
      recolorear.current = null
      observador.disconnect()
      if (granja) liberarGalpon(granja.modelo)
      adornos?.liberar()
      ambiente.dispose()
      sol.dispose()
      sol.shadow.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div className="gp-escena" data-fase={fase} data-clima={clima}>
      <div ref={contenedor} className="gp-escena-visor" role="img" aria-label={`${nombre} en 3D`} />
      {sinModelo && <img className="gp-escena-respaldo" src={granjaImagen} alt={`Ilustración de ${nombre}`} />}
    </div>
  )
}

export default EscenaGranja
