import { useEffect, useRef, useState } from 'react'
import {
  ACESFilmicToneMapping,
  Box3,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Texture,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import Pollito from '@shared/ui/ilustraciones/Pollito'
import { ALTO_LIENZO_POLLO, PX_POR_UNIDAD_POLLO } from '../model/reglaCiclo'

const RUTA_POLLO = `${import.meta.env.BASE_URL}modelos/pollo-cgtrader-blanco.glb`

type Props = { escala: number; mirada: -1 | 0 | 1 }

const DISTANCIA_CAMARA = 4.1
const YAW_ADELANTE = 1.25
const YAW_REPOSO = 0.8
const CABECEO_PICOTAZO = 0.26
const CICLO_PICOTAZO = 7
const DURACION_PICOTAZO = 0.11
const SALTO_DURACION = 0.95
const SALTO_ALTURA = 0.1
const VELOCIDAD_GIRO = 2.6
const VELOCIDAD_RESPIRACION = 1.1
const VELOCIDAD_BALANCEO = 0.4
const INTERVALO_CUADRO_MS = 22

function yawDe(mirada: -1 | 0 | 1): number {
  return mirada === 0 ? YAW_REPOSO : mirada * YAW_ADELANTE
}

function cabeceoDe(t: number): number {
  const fase = (t % CICLO_PICOTAZO) / CICLO_PICOTAZO
  const picotazo = (inicio: number) => {
    const avance = (fase - inicio) / DURACION_PICOTAZO
    return avance > 0 && avance < 1 ? Math.sin(avance * Math.PI) : 0
  }
  return CABECEO_PICOTAZO * Math.max(picotazo(0.12), picotazo(0.3))
}

function liberarModelo(raiz: Object3D) {
  const geometrias = new Set<BufferGeometry>()
  const materiales = new Set<Material>()
  const texturas = new Set<Texture>()

  raiz.traverse((objeto) => {
    if (!(objeto instanceof Mesh)) return
    geometrias.add(objeto.geometry)
    const listaMateriales = Array.isArray(objeto.material) ? objeto.material : [objeto.material]
    listaMateriales.forEach((material) => {
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

function PolloMarcador3D({ escala, mirada }: Props) {
  const lienzoRef = useRef<HTMLDivElement>(null)
  const modeloRef = useRef<Group | null>(null)
  const dibujarRef = useRef<(() => void) | null>(null)
  const escalaRef = useRef(escala)
  const miradaRef = useRef(mirada)
  const saltoRef = useRef(-1)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    escalaRef.current = escala
    if (!modeloRef.current) return
    modeloRef.current.scale.setScalar(escala)
    dibujarRef.current?.()
  }, [escala])

  useEffect(() => {
    if (miradaRef.current !== mirada) saltoRef.current = performance.now() / 1000
    miradaRef.current = mirada
    dibujarRef.current?.()
  }, [mirada])

  useEffect(() => {
    const contenedor = lienzoRef.current
    if (!contenedor) return

    let cancelado = false
    let modelo: Group | null = null
    let cabeceo: Group | null = null
    let renderer: WebGLRenderer
    let marco = 0
    let ultimoCuadro = 0
    let yawActual = yawDe(miradaRef.current)
    let visible = true
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)')

    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    } catch {
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = SRGBColorSpace
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 1
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.setAttribute('aria-hidden', 'true')
    contenedor.appendChild(renderer.domElement)

    const escena = new Scene()
    const camara = new PerspectiveCamera(24, 1, 0.1, 30)

    const luzAmbiente = new HemisphereLight(0xfffaf0, 0x9a948a, 1.2)
    const luzPrincipal = new DirectionalLight(0xffffff, 1.25)
    luzPrincipal.position.set(-2, 3.5, 4)
    escena.add(luzAmbiente, luzPrincipal)

    const poner = (t: number) => {
      if (!modelo || !cabeceo) return
      const quieto = reducido.matches
      const ahora = performance.now() / 1000
      modelo.rotation.y = yawActual + (quieto ? 0 : Math.sin(t * VELOCIDAD_BALANCEO) * 0.09)
      cabeceo.rotation.x = quieto ? 0 : cabeceoDe(t)
      const avanceSalto = (ahora - saltoRef.current) / SALTO_DURACION
      const salto = !quieto && avanceSalto > 0 && avanceSalto < 1 ? Math.sin(avanceSalto * Math.PI) * SALTO_ALTURA : 0
      const respiracion = quieto ? 0 : Math.sin(t * VELOCIDAD_RESPIRACION) * 0.01
      modelo.position.y = (salto + respiracion) * escalaRef.current
    }

    const dibujar = () => {
      if (reducido.matches) yawActual = yawDe(miradaRef.current)
      poner(performance.now() / 1000)
      renderer.render(escena, camara)
    }
    dibujarRef.current = dibujar

    const animar = (ahoraMs: number) => {
      marco = window.requestAnimationFrame(animar)
      if (!visible || document.hidden || ahoraMs - ultimoCuadro < INTERVALO_CUADRO_MS) return
      const dt = Math.min(0.1, (ahoraMs - ultimoCuadro) / 1000)
      ultimoCuadro = ahoraMs
      yawActual += (yawDe(miradaRef.current) - yawActual) * (1 - Math.exp(-dt * VELOCIDAD_GIRO))
      poner(ahoraMs / 1000)
      renderer.render(escena, camara)
    }

    const arrancar = () => {
      window.cancelAnimationFrame(marco)
      if (!reducido.matches) marco = window.requestAnimationFrame(animar)
      else dibujar()
    }

    const observador = new IntersectionObserver(([entrada]) => { visible = entrada.isIntersecting })
    observador.observe(contenedor)
    reducido.addEventListener('change', arrancar)

    const encuadrar = () => {
      const ancho = contenedor.clientWidth
      const alto = contenedor.clientHeight
      if (!ancho || !alto) return
      const altoUnidades = alto / PX_POR_UNIDAD_POLLO
      renderer.setSize(ancho, alto, false)
      camara.aspect = ancho / alto
      camara.fov = (2 * Math.atan(altoUnidades / 2 / DISTANCIA_CAMARA) * 180) / Math.PI
      camara.position.set(0, altoUnidades / 2, DISTANCIA_CAMARA)
      camara.lookAt(0, altoUnidades / 2, 0)
      camara.updateProjectionMatrix()
      dibujar()
    }

    const redimension = new ResizeObserver(encuadrar)
    redimension.observe(contenedor)

    const cargador = new GLTFLoader()
    cargador.load(RUTA_POLLO, (gltf) => {
      if (cancelado) {
        liberarModelo(gltf.scene)
        return
      }

      const caja = new Box3().setFromObject(gltf.scene)
      const tamano = caja.getSize(new Vector3())
      if (tamano.y <= 0) {
        liberarModelo(gltf.scene)
        return
      }

      const centro = caja.getCenter(new Vector3())
      const unidad = 1 / tamano.y
      gltf.scene.scale.setScalar(unidad)
      gltf.scene.position.set(-centro.x * unidad, -caja.min.y * unidad, -centro.z * unidad)

      cabeceo = new Group()
      cabeceo.add(gltf.scene)
      modelo = new Group()
      modelo.add(cabeceo)
      modelo.scale.setScalar(escalaRef.current)
      modeloRef.current = modelo
      escena.add(modelo)
      encuadrar()
      arrancar()
      setListo(true)
    }, undefined, () => {
      if (!cancelado) setListo(false)
    })

    encuadrar()

    return () => {
      cancelado = true
      window.cancelAnimationFrame(marco)
      observador.disconnect()
      reducido.removeEventListener('change', arrancar)
      redimension.disconnect()
      dibujarRef.current = null
      modeloRef.current = null
      if (modelo) {
        escena.remove(modelo)
        liberarModelo(modelo)
      }
      luzAmbiente.dispose()
      luzPrincipal.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <span className={`regla-hoy-modelo${listo ? ' is-listo' : ''}`} aria-hidden="true">
      <div ref={lienzoRef} className="regla-hoy-modelo-lienzo pollito" />
      <svg className="regla-hoy-modelo-fallback" viewBox={`-30 ${-ALTO_LIENZO_POLLO} 60 ${ALTO_LIENZO_POLLO}`} width="60" height={ALTO_LIENZO_POLLO} overflow="visible">
        <Pollito x={0} y={0} escala={escala} />
      </svg>
    </span>
  )
}

export default PolloMarcador3D
