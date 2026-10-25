import { useEffect, useRef, useState } from 'react'
import {
  ACESFilmicToneMapping,
  DirectionalLight,
  HemisphereLight,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'
import { liberarGalpon } from '@features/dashboard/components/escena/modeloGalpon'
import { LUCES } from '@features/dashboard/components/escena/lucesPorFase'
import { useFaseDelDia } from '@features/dashboard/hooks/useFaseDelDia'
import type { FaseDelDia } from '@features/dashboard/model/escenaGalpon'
import granjaImagen from '@features/dashboard/assets/escena/granja-popayan-low-poly.webp'
import { crearAdornos, type AdornosGranja } from './adornosGranja'
import { cargarModeloGranja, type GranjaCargada } from './modeloGranja'

const ELEVACION = (11 * Math.PI) / 180
const ACIMUT = 0
const CAMPO_VISION = 24
const MARGEN_ENCUADRE = 0.87

function EscenaGranja({ nombre }: { nombre: string }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const [sinModelo, setSinModelo] = useState(false)
  const fase = useFaseDelDia()
  const faseActual = useRef(fase)
  const ajustarLuz = useRef<((fase: FaseDelDia) => void) | null>(null)
  faseActual.current = fase

  useEffect(() => {
    ajustarLuz.current?.(fase)
  }, [fase])

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
    const camara = new PerspectiveCamera(CAMPO_VISION, 1, 0.1, 800)
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

    const colocarCamara = (distancia: number, objetivo: Vector3) => {
      camara.position.set(
        objetivo.x + Math.sin(ACIMUT) * Math.cos(ELEVACION) * distancia,
        objetivo.y + Math.sin(ELEVACION) * Math.cos(0) * distancia,
        objetivo.z + Math.cos(ACIMUT) * Math.cos(ELEVACION) * distancia,
      )
      camara.lookAt(objetivo)
      camara.updateMatrixWorld()
    }

    const cabe = (distancia: number, objetivo: Vector3, esquinas: Vector3[]) => {
      colocarCamara(distancia, objetivo)
      return esquinas.every((esquina) => {
        const punto = esquina.clone().project(camara)
        return Math.abs(punto.x) <= MARGEN_ENCUADRE && Math.abs(punto.y) <= MARGEN_ENCUADRE
      })
    }

    const dibujar = () => {
      if (!granja) return
      const { centro, tamano } = granja
      const objetivo = new Vector3(centro.x, centro.y + tamano.y * 0.4, centro.z)
      const esquinas = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => (
        new Vector3(centro.x + (x * tamano.x) / 2, centro.y + (y * tamano.y) / 2, centro.z + (z * tamano.z) / 2)
      ))))
      let cerca = granja.radio * 0.5
      let lejos = granja.radio * 6
      for (let paso = 0; paso < 14; paso++) {
        const medio = (cerca + lejos) / 2
        if (cabe(medio, objetivo, esquinas)) lejos = medio
        else cerca = medio
      }
      colocarCamara(lejos, objetivo)
      renderer.render(mundo, camara)
    }

    const iluminar = (nueva: FaseDelDia) => {
      const luz = LUCES[nueva]
      ambiente.color.set(luz.cielo)
      ambiente.groundColor.set(luz.suelo)
      ambiente.intensity = luz.ambiente
      sol.color.set(luz.sol)
      sol.intensity = luz.fuerza
      sol.position.set(luz.x * 2, luz.y * 2, luz.z * 2)
      adornos?.aplicarFase(nueva)
      renderer.shadowMap.needsUpdate = true
      dibujar()
    }
    ajustarLuz.current = iluminar
    iluminar(faseActual.current)

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
      adornos.aplicarFase(faseActual.current)
      const alcance = cargada.radio * 1.1
      Object.assign(sol.shadow.camera, { left: -alcance, right: alcance, top: alcance, bottom: -alcance, near: 1, far: 400 })
      sol.shadow.camera.updateProjectionMatrix()
      sol.target.position.copy(cargada.centro)
      renderer.shadowMap.needsUpdate = true
      encuadrar()
    })

    return () => {
      cancelado = true
      ajustarLuz.current = null
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
    <div className="gp-escena" data-fase={fase}>
      <div
        ref={contenedor}
        className="gp-escena-visor"
        role="img"
        aria-label={`${nombre} en 3D`}
      />
      {sinModelo && <img className="gp-escena-respaldo" src={granjaImagen} alt={`Ilustración de ${nombre}`} />}
    </div>
  )
}

export default EscenaGranja
