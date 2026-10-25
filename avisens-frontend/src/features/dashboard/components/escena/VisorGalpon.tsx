import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import {
  ACESFilmicToneMapping,
  DirectionalLight,
  HemisphereLight,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Quaternion,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'
import { escalaDelPollito, type ClaseSensor, type FaseDelDia } from '../../model/escenaGalpon'
import { cargarModeloGalpon, liberarGalpon, type GalponCargado } from './modeloGalpon'
import galponImagen from '../../assets/escena/galpon-v4-low-poly.webp'
import { LUCES } from './lucesPorFase'
import { cargarModeloPollo } from './modeloPollo'

export type Proyeccion = Partial<Record<ClaseSensor, { x: number; y: number }>>

type Props = {
  clases: ClaseSensor[]
  nombre: string
  fase: FaseDelDia
  aves: number
  diaLote: number | null
  onProyeccion: (proyeccion: Proyeccion) => void
}

const ELEVACION = (17 * Math.PI) / 180
const ACIMUT_BASE = (24 * Math.PI) / 180
const VELOCIDAD_GIRO = 0.04
const SALTO_MAXIMO = 0.05
const CAMPO_VISION = 24
const PIXELES_MAXIMOS = 2
const MAXIMO_POLLOS = 60
const SEPARACION_POLLOS = 1.5
const PASO_TECLADO = (6 * Math.PI) / 180

const PUNTOS: Record<ClaseSensor, { fx: number; fy: number; fz: number }> = {
  temperatura: { fx: -0.22, fy: 0.3, fz: -0.24 },
  humedad: { fx: -0.22, fy: 0.3, fz: 0.24 },
  co2: { fx: 0.22, fy: 0.3, fz: -0.24 },
  amoniaco: { fx: 0.22, fy: 0.3, fz: 0.24 },
  luz: { fx: 0, fy: 0.9, fz: 0 },
}

function aleatorio(semilla: number) {
  let estado = semilla
  return () => {
    estado = (estado + 0x6d2b79f5) | 0
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function poblar(modelo: Group, galpon: GalponCargado, cantidad: number, escala: number): InstancedMesh | null {
  let origen: Mesh | null = null
  modelo.updateMatrixWorld(true)
  modelo.traverse((parte) => {
    if (!origen && parte instanceof Mesh) origen = parte
  })
  const malla = origen as Mesh | null
  if (!malla) return null
  const propia = modelo.matrixWorld.clone().invert().multiply(malla.matrixWorld)
  const geometria = malla.geometry.clone().applyMatrix4(propia)
  const instancias = new InstancedMesh(geometria, malla.material, cantidad)
  instancias.castShadow = true
  instancias.receiveShadow = true

  const azar = aleatorio(11)
  const puestos: { x: number; z: number }[] = []
  const mitadX = galpon.tamano.x / 2 - 1.6
  const mitadZ = galpon.tamano.z / 2 - 1.4
  const FUERA = 14
  const dentroDe = (x: number, z: number, holgura: number) =>
    Math.abs(x) < galpon.tamano.x / 2 + holgura && Math.abs(z) < galpon.tamano.z / 2 + holgura
  for (let intento = 0; intento < cantidad * 80 && puestos.length < cantidad; intento++) {
    const afuera = puestos.length >= cantidad - FUERA
    let x: number
    let z: number
    if (afuera) {
      const angulo = azar() * Math.PI * 2
      const distancia = galpon.radioBase * (0.5 + azar() * 0.38)
      x = Math.sin(angulo) * distancia
      z = Math.cos(angulo) * distancia
      if (dentroDe(x, z, 2.2)) continue
    } else {
      x = (azar() * 2 - 1) * mitadX
      z = (azar() * 2 - 1) * mitadZ
    }
    if (puestos.some((otro) => Math.hypot(otro.x - x, otro.z - z) < SEPARACION_POLLOS)) continue
    puestos.push({ x, z })
  }

  const matriz = new Matrix4()
  const giro = new Quaternion()
  const eje = new Vector3(0, 1, 0)
  puestos.forEach((puesto, indice) => {
    const talla = escala * (0.9 + azar() * 0.2)
    giro.setFromAxisAngle(eje, azar() * Math.PI * 2)
    matriz.compose(
      new Vector3(galpon.centro.x + puesto.x, galpon.caja.min.y + 0.12, galpon.centro.z + puesto.z),
      giro,
      new Vector3(talla, talla, talla),
    )
    instancias.setMatrixAt(indice, matriz)
  })
  instancias.count = puestos.length
  instancias.instanceMatrix.needsUpdate = true
  return instancias
}

function VisorGalpon({ clases, nombre, fase, aves, diaLote, onProyeccion }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const [sinModelo, setSinModelo] = useState(false)
  const girar = useRef<((delta: number) => void) | null>(null)
  const arrastre = useRef<{ x: number } | null>(null)
  const clasesActuales = useRef(clases)
  const avisar = useRef(onProyeccion)
  const reproyectar = useRef<(() => void) | null>(null)
  const luzFase = useRef(fase)
  const ajustarLuz = useRef<((fase: FaseDelDia) => void) | null>(null)
  luzFase.current = fase
  useEffect(() => {
    ajustarLuz.current?.(fase)
  }, [fase])
  const poblacion = useRef({ aves, diaLote })
  poblacion.current = { aves, diaLote }
  avisar.current = onProyeccion
  clasesActuales.current = clases
  const firma = clases.join('|')

  useEffect(() => {
    reproyectar.current?.()
  }, [firma])

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, PIXELES_MAXIMOS))
    renderer.outputColorSpace = SRGBColorSpace
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.88
    renderer.setClearColor(0x000000, 0)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = PCFSoftShadowMap
    renderer.shadowMap.autoUpdate = false
    renderer.domElement.setAttribute('aria-hidden', 'true')
    caja.appendChild(renderer.domElement)

    const mundo = new Scene()
    const camara = new PerspectiveCamera(CAMPO_VISION, 1, 0.1, 500)
    const ambiente = new HemisphereLight(0xf2f6fb, 0xaebca0, 1.15)
    const sol = new DirectionalLight(0xffeccb, 1.9)
    sol.position.set(14, 22, 12)
    sol.castShadow = true
    sol.shadow.mapSize.set(2048, 2048)
    sol.shadow.bias = -0.0004
    sol.shadow.normalBias = 0.06
    sol.shadow.radius = 3
    mundo.add(ambiente, sol, sol.target)


    let galpon: GalponCargado | null = null
    let acimut = ACIMUT_BASE
    let cancelado = false
    let animacion = 0
    let visible = true

    const proyectar = () => {
      if (!galpon) return
      const ancho = caja.clientWidth
      const alto = caja.clientHeight
      const resultado: Proyeccion = {}
      for (const clase of clasesActuales.current) {
        const punto = PUNTOS[clase]
        const posicion = new Vector3(
          galpon.centro.x + punto.fx * galpon.tamano.x,
          galpon.caja.min.y + punto.fy * galpon.tamano.y,
          galpon.centro.z + punto.fz * galpon.tamano.z,
        ).project(camara)
        resultado[clase] = { x: ((posicion.x + 1) / 2) * ancho, y: ((1 - posicion.y) / 2) * alto }
      }
      avisar.current(resultado)
    }

    const dibujar = () => {
      if (!galpon) return
      const mediaVertical = Math.tan((CAMPO_VISION * Math.PI) / 360)
      const mediaHorizontal = mediaVertical * camara.aspect
      const distancia = Math.max(galpon.radioBase / mediaHorizontal, (galpon.tamano.y * 1.6) / mediaVertical) * 1.14
      camara.position.set(
        galpon.centro.x + Math.sin(acimut) * Math.cos(ELEVACION) * distancia,
        galpon.centro.y + Math.sin(ELEVACION) * distancia,
        galpon.centro.z + Math.cos(acimut) * Math.cos(ELEVACION) * distancia,
      )
      camara.lookAt(galpon.centro.x, galpon.centro.y - galpon.tamano.y * 0.06, galpon.centro.z)
      camara.updateMatrixWorld()
      renderer.render(mundo, camara)
      proyectar()
    }

    const iluminar = (nueva: FaseDelDia) => {
      const luz = LUCES[nueva]
      ambiente.color.set(luz.cielo)
      ambiente.groundColor.set(luz.suelo)
      ambiente.intensity = luz.ambiente
      sol.color.set(luz.sol)
      sol.intensity = luz.fuerza
      sol.position.set(luz.x, luz.y, luz.z)
      renderer.shadowMap.needsUpdate = true
      dibujar()
    }
    ajustarLuz.current = iluminar
    iluminar(luzFase.current)

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
    const vigia = new IntersectionObserver(([entrada]) => { visible = entrada.isIntersecting })
    vigia.observe(caja)

    girar.current = (delta) => {
      acimut += delta
      dibujar()
    }
    reproyectar.current = proyectar

    void cargarModeloGalpon().then((cargado) => {
      if (cancelado) return
      if (!cargado) {
        setSinModelo(true)
        return
      }
      galpon = cargado
      mundo.add(cargado.escenario, cargado.modelo)
      const alcance = cargado.radioBase * 1.15
      Object.assign(sol.shadow.camera, { left: -alcance, right: alcance, top: alcance, bottom: -alcance, near: 1, far: 120 })
      sol.shadow.camera.updateProjectionMatrix()
      sol.target.position.copy(cargado.centro)
      renderer.shadowMap.needsUpdate = true
      if (poblacion.current.aves > 0) {
        void cargarModeloPollo().then((pollo) => {
          if (cancelado || !pollo) return
          const cantidad = Math.min(MAXIMO_POLLOS, Math.max(14, Math.round(poblacion.current.aves / 9)))
          const bandada = poblar(pollo, cargado, cantidad, escalaDelPollito(poblacion.current.diaLote) * 1.9)
          if (!bandada) return
          bandada.name = 'bandada'
          mundo.add(bandada)
          renderer.shadowMap.needsUpdate = true
          dibujar()
        })
      }
      encuadrar()
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      let ultimo = performance.now()
      const bucle = (ahora: number) => {
        const transcurrido = Math.min((ahora - ultimo) / 1000, SALTO_MAXIMO)
        ultimo = ahora
        if (visible && !document.hidden && !arrastre.current) {
          acimut += VELOCIDAD_GIRO * transcurrido
          dibujar()
        }
        animacion = window.requestAnimationFrame(bucle)
      }
      animacion = window.requestAnimationFrame(bucle)
    })

    return () => {
      cancelado = true
      girar.current = null
      ajustarLuz.current = null
      reproyectar.current = null
      window.cancelAnimationFrame(animacion)
      observador.disconnect()
      vigia.disconnect()
      const bandada = mundo.getObjectByName('bandada')
      if (bandada instanceof InstancedMesh) {
        bandada.geometry.dispose()
        bandada.dispose()
      }
      if (galpon) {
        liberarGalpon(galpon.modelo)
        liberarGalpon(galpon.escenario)
      }
      ambiente.dispose()
      sol.dispose()
      sol.shadow.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [])

  function alPresionar(evento: PointerEvent<HTMLDivElement>) {
    arrastre.current = { x: evento.clientX }
    evento.currentTarget.setPointerCapture(evento.pointerId)
  }

  function alMover(evento: PointerEvent<HTMLDivElement>) {
    if (!arrastre.current) return
    girar.current?.((evento.clientX - arrastre.current.x) * 0.008)
    arrastre.current = { x: evento.clientX }
  }

  function alSoltar(evento: PointerEvent<HTMLDivElement>) {
    arrastre.current = null
    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) evento.currentTarget.releasePointerCapture(evento.pointerId)
  }

  function alPresionarTecla(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === 'ArrowLeft') {
      evento.preventDefault()
      girar.current?.(-PASO_TECLADO)
    } else if (evento.key === 'ArrowRight') {
      evento.preventDefault()
      girar.current?.(PASO_TECLADO)
    }
  }

  return (
    <div
      ref={contenedor}
      className="gsr-visor"
      role="group"
      tabIndex={0}
      aria-label={`${nombre} en 3D, girando solo. Arrastra o usa las flechas para girarlo a mano`}
      onPointerDown={alPresionar}
      onPointerMove={alMover}
      onPointerUp={alSoltar}
      onPointerCancel={alSoltar}
      onKeyDown={alPresionarTecla}
    >
      {sinModelo && <img className="gsr-respaldo" src={galponImagen} alt={`Ilustración de ${nombre}`} />}
    </div>
  )
}

export default VisorGalpon
