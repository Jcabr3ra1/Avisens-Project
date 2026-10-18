import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ACESFilmicToneMapping,
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  Raycaster,
  RingGeometry,
  Scene,
  Shape,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  Object3D,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { GranjaOrganizacionDetalle } from '../api/organizaciones'
import { GALPON, MARGEN_SUELO, aleatorioConSemilla, distribuirMaqueta, sembrarArboles, sembrarPasto, ubicarGallinas } from '../model/maqueta'
import { CREDITO_GALLINA, cargarModelosEscena, type ModelosEscena } from './modelosEscena'
import './EscenaOrganizacion.css'

interface Props {
  granjas: GranjaOrganizacionDetalle[]
  semilla: number
  descripcion: string
  resaltadaId: number | null
  alElegirGranja: (granjaId: number) => void
}

interface Etiqueta {
  nombre: string
  detalle: string
}

interface ParcelaViva {
  id: number
  grupo: Group
  contorno: MeshBasicMaterial
  retraso: number
  elevacion: number
}

interface EntradaGalpon {
  nave: Group
  retraso: number
}

interface GallinaViva {
  objeto: Object3D
  giro: number
  fase: number
}

interface Baliza {
  anillo: Mesh
  material: MeshBasicMaterial
  fase: number
}

const ALTO_PAREDES = 0.5
const ALTO_TECHO = 0.36
const INCLINACION_CAMARA = 0.62

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3
const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2
const limitar = (valor: number) => Math.min(Math.max(valor, 0), 1)

function firmaDe(granjas: GranjaOrganizacionDetalle[]): string {
  return JSON.stringify(granjas.map(granja => [
    granja.id,
    granja.nombre,
    granja.activa,
    granja.galpones.map(galpon => [galpon.id, galpon.activo, galpon._count.dispositivo, galpon._count.sensores]),
  ]))
}

function plural(cantidad: number, singular: string, varios: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : varios}`
}

function EscenaOrganizacion({ granjas, semilla, descripcion, resaltadaId, alElegirGranja }: Props) {
  const lienzoRef = useRef<HTMLDivElement>(null)
  const etiquetaRef = useRef<HTMLDivElement>(null)
  const granjasRef = useRef(granjas)
  const resaltadaRef = useRef(resaltadaId)
  const elegirRef = useRef(alElegirGranja)
  const animarEntradaRef = useRef(true)
  const [etiqueta, setEtiqueta] = useState<Etiqueta | null>(null)
  const [etiquetaVisible, setEtiquetaVisible] = useState(false)
  const [sinWebgl, setSinWebgl] = useState(false)
  const [lista, setLista] = useState(false)
  const [conModeloGalpon, setConModeloGalpon] = useState(false)
  const [conGallinas, setConGallinas] = useState(false)
  const firma = useMemo(() => firmaDe(granjas), [granjas])

  useEffect(() => {
    granjasRef.current = granjas
    resaltadaRef.current = resaltadaId
    elegirRef.current = alElegirGranja
  })

  useEffect(() => {
    const montar = (contenedor: HTMLDivElement, modelos: ModelosEscena): (() => void) | undefined => {
      let renderer: WebGLRenderer
      try {
        renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
      } catch {
        setSinWebgl(true)
        return
      }

      const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const animarEntrada = animarEntradaRef.current && !reducirMovimiento
      animarEntradaRef.current = false

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = PCFShadowMap
      renderer.toneMapping = ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.05
      const lienzo = renderer.domElement
      lienzo.className = 'org-escena-canvas'
      contenedor.appendChild(lienzo)

      const maqueta = distribuirMaqueta(granjasRef.current)
      const escena = new Scene()
      const camara = new PerspectiveCamera(32, 1, 0.1, 500)
      const desechables: Array<{ dispose: () => void }> = []
      const guardar = <T extends { dispose: () => void }>(recurso: T): T => {
        desechables.push(recurso)
        return recurso
      }

      // WebGL necesita el color resuelto; no interpreta var() como el CSS.
      const estilos = getComputedStyle(contenedor)
      const colorMarca = (token: string) => estilos.getPropertyValue(token).trim()
      const material = {
        suelo: guardar(new MeshStandardMaterial({ color: '#8dbb5f', roughness: 1 })),
        borde: guardar(new MeshStandardMaterial({ color: '#5e8a3c', roughness: 1 })),
        zona: guardar(new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })),
        paredes: guardar(new MeshStandardMaterial({ color: colorMarca('--surface-page'), roughness: 0.75 })),
        paredesInactivas: guardar(new MeshStandardMaterial({ color: '#cdd3cf', roughness: 0.9 })),
        techo: guardar(new MeshStandardMaterial({ color: colorMarca('--primary'), roughness: 0.55 })),
        techoInactivo: guardar(new MeshStandardMaterial({ color: '#94a39b', roughness: 0.8 })),
        puerta: guardar(new MeshStandardMaterial({ color: colorMarca('--text-primary'), roughness: 0.9 })),
        ventana: guardar(new MeshStandardMaterial({ color: colorMarca('--avisens-maize'), emissive: colorMarca('--avisens-maize'), emissiveIntensity: 0.35 })),
        poste: guardar(new MeshStandardMaterial({ color: '#5d6b63', roughness: 0.6 })),
        baliza: guardar(new MeshStandardMaterial({ color: colorMarca('--avisens-maize'), emissive: colorMarca('--avisens-maize'), emissiveIntensity: 1.1 })),
        copa: guardar(new MeshStandardMaterial({ color: colorMarca('--success'), roughness: 0.9, flatShading: true })),
        copaClara: guardar(new MeshStandardMaterial({ color: colorMarca('--avisens-sage'), roughness: 0.9, flatShading: true })),
        tronco: guardar(new MeshStandardMaterial({ color: '#7a5a3a', roughness: 1 })),
      }

      const largoTecho = GALPON.largo + 0.16
      const perfilTecho = new Shape()
      perfilTecho.moveTo(-GALPON.ancho / 2 - 0.08, 0)
      perfilTecho.lineTo(GALPON.ancho / 2 + 0.08, 0)
      perfilTecho.lineTo(0, ALTO_TECHO)
      perfilTecho.closePath()
      const geometria = {
        cuerpo: guardar(new BoxGeometry(GALPON.ancho, ALTO_PAREDES, GALPON.largo).translate(0, ALTO_PAREDES / 2, 0)),
        techo: guardar(new ExtrudeGeometry(perfilTecho, { depth: largoTecho, bevelEnabled: false }).translate(0, ALTO_PAREDES, -largoTecho / 2)),
        puerta: guardar(new BoxGeometry(0.34, 0.32, 0.02).translate(0, 0.16, GALPON.largo / 2 + 0.01)),
        ventana: guardar(new BoxGeometry(0.02, 0.1, GALPON.largo * 0.72).translate(GALPON.ancho / 2 + 0.011, ALTO_PAREDES * 0.66, 0)),
        poste: guardar(new CylinderGeometry(0.014, 0.014, 0.26, 6).translate(0, ALTO_PAREDES + ALTO_TECHO + 0.13, GALPON.largo * 0.3)),
        baliza: guardar(new SphereGeometry(0.075, 16, 12).translate(0, ALTO_PAREDES + ALTO_TECHO + 0.3, GALPON.largo * 0.3)),
        anillo: guardar(new RingGeometry(0.1, 0.13, 40)),
        copa: guardar(new ConeGeometry(0.32, 0.85, 7).translate(0, 0.62, 0)),
        tronco: guardar(new CylinderGeometry(0.05, 0.07, 0.22, 6).translate(0, 0.11, 0)),
      }

      const radioSuelo = maqueta.radio + MARGEN_SUELO
      const suelo = new Mesh(guardar(new CircleGeometry(radioSuelo, 72)), material.suelo)
      suelo.rotation.x = -Math.PI / 2
      suelo.receiveShadow = true
      escena.add(suelo)
      const borde = new Mesh(guardar(new CylinderGeometry(radioSuelo, radioSuelo + 0.15, 0.4, 72, 1, true)), material.borde)
      borde.position.y = -0.2
      escena.add(borde)

      const parcelas: ParcelaViva[] = []
      const entradas: EntradaGalpon[] = []
      const balizas: Baliza[] = []
      const gallinas: GallinaViva[] = []
      const ubicaciones = modelos.gallina ? ubicarGallinas(maqueta, aleatorioConSemilla(semilla + 17)) : []
      const seleccionables: Object3D[] = []

      maqueta.parcelas.forEach((parcela, indice) => {
        const grupo = new Group()
        grupo.position.set(parcela.x, 0, parcela.z)
        const zona = new Mesh(guardar(new BoxGeometry(parcela.ancho, 0.05, parcela.fondo)), material.zona)
        zona.position.y = 0.025
        zona.userData.granjaId = parcela.id
        grupo.add(zona)
        seleccionables.push(zona)
        const materialContorno = guardar(new MeshBasicMaterial({ color: colorMarca('--avisens-maize'), transparent: true, opacity: 0, depthWrite: false }))
        const contorno = new Mesh(guardar(new RoundedBoxGeometry(parcela.ancho, 0.02, parcela.fondo, 2, 0.01)), materialContorno)
        contorno.position.set(parcela.x, 0.012, parcela.z)
        escena.add(contorno)

        const retraso = indice * 110
        parcela.galpones.forEach((galpon, posicion) => {
          const nave = new Group()
          nave.position.set(galpon.x, 0, galpon.z)
          const piezas: Mesh[] = []
          if (modelos.galpon) {
            const modelo = (galpon.activo ? modelos.galpon.activo : modelos.galpon.inactivo).clone(true)
            modelo.traverse(parte => {
              if (parte instanceof Mesh) {
                parte.userData.granjaId = parcela.id
                seleccionables.push(parte)
              }
            })
            nave.add(modelo)
          } else {
            piezas.push(
              new Mesh(geometria.cuerpo, galpon.activo ? material.paredes : material.paredesInactivas),
              new Mesh(geometria.techo, galpon.activo ? material.techo : material.techoInactivo),
              new Mesh(geometria.puerta, material.puerta),
            )
            if (galpon.activo) piezas.push(new Mesh(geometria.ventana, material.ventana))
          }
          if (galpon.activo && galpon.sensores > 0) {
            const senal = new Group()
            senal.position.y = (modelos.galpon?.alto ?? ALTO_PAREDES + ALTO_TECHO) - (ALTO_PAREDES + ALTO_TECHO)
            const poste = new Mesh(geometria.poste, material.poste)
            const baliza = new Mesh(geometria.baliza, material.baliza)
            poste.castShadow = true
            baliza.userData.granjaId = parcela.id
            const materialAnillo = guardar(new MeshBasicMaterial({ color: colorMarca('--avisens-maize'), transparent: true, side: DoubleSide, depthWrite: false }))
            const anillo = new Mesh(geometria.anillo, materialAnillo)
            anillo.rotation.x = -Math.PI / 2
            anillo.position.set(0, ALTO_PAREDES + ALTO_TECHO + 0.3, GALPON.largo * 0.3)
            senal.add(poste, baliza, anillo)
            nave.add(senal)
            seleccionables.push(baliza)
            balizas.push({ anillo, material: materialAnillo, fase: (posicion * 0.37 + indice * 0.21) % 1 })
          }
          piezas.forEach(pieza => {
            pieza.castShadow = true
            pieza.receiveShadow = true
            pieza.userData.granjaId = parcela.id
            nave.add(pieza)
            seleccionables.push(pieza)
          })
          grupo.add(nave)
          entradas.push({ nave, retraso: retraso + 280 + posicion * 70 })
        })

        const molde = modelos.gallina
        if (molde) {
          ubicaciones.filter(ubicacion => ubicacion.granjaId === parcela.id).forEach(ubicacion => {
            const gallina = molde.clone(true)
            gallina.position.set(ubicacion.x, 0, ubicacion.z)
            gallina.rotation.y = ubicacion.giro
            grupo.add(gallina)
            gallinas.push({ objeto: gallina, giro: ubicacion.giro, fase: ubicacion.fase })
          })
        }

        escena.add(grupo)
        parcelas.push({ id: parcela.id, grupo, contorno: materialContorno, retraso, elevacion: 0 })
      })

      const azar = aleatorioConSemilla(semilla)
      const radioArbol = modelos.arboles.reduce((maximo, modelo) => Math.max(maximo, modelo.userData.radio ?? 0), 0) || 0.32
      const arbolesSembrados = sembrarArboles(maqueta, azar, { variantes: modelos.arboles.length || 2, radioArbol })
      arbolesSembrados.forEach(({ x, z, escala, giro, variante }) => {
        const arbol = new Group()
        arbol.position.set(x, 0, z)
        arbol.scale.setScalar(escala)
        arbol.rotation.y = giro
        if (modelos.arboles.length > 0) {
          arbol.add(modelos.arboles[variante].clone(true))
        } else {
          const copa = new Mesh(geometria.copa, variante === 0 ? material.copa : material.copaClara)
          const tronco = new Mesh(geometria.tronco, material.tronco)
          copa.castShadow = true
          tronco.castShadow = true
          arbol.add(copa, tronco)
        }
        escena.add(arbol)
      })

      if (modelos.pasto.length > 0) {
        const matas = sembrarPasto(maqueta, azar, arbolesSembrados, { variantes: modelos.pasto.length })
        const ayudante = new Object3D()
        modelos.pasto.forEach((pasto, variante) => {
          const propias = matas.filter(mata => mata.variante === variante)
          if (propias.length === 0) return
          const instancias = guardar(new InstancedMesh(pasto.geometria, pasto.material, propias.length))
          propias.forEach((mata, indiceMata) => {
            ayudante.position.set(mata.x, 0, mata.z)
            ayudante.rotation.set(0, mata.giro, 0)
            ayudante.scale.setScalar(mata.escala)
            ayudante.updateMatrix()
            instancias.setMatrixAt(indiceMata, ayudante.matrix)
          })
          instancias.instanceMatrix.needsUpdate = true
          instancias.receiveShadow = true
          escena.add(instancias)
        })
      }

      escena.add(new HemisphereLight('#ffffff', '#c3d1ad', 1.9))
      const sol = new DirectionalLight('#fff3d6', 2.6)
      sol.position.set(maqueta.radio * 0.7 + 5, maqueta.radio * 1.5 + 9, maqueta.radio * 0.4 + 6)
      sol.castShadow = true
      sol.shadow.mapSize.set(1024, 1024)
      sol.shadow.radius = 3
      sol.shadow.bias = -0.0006
      const alcance = radioSuelo + 1
      sol.shadow.camera.left = -alcance
      sol.shadow.camera.right = alcance
      sol.shadow.camera.top = alcance
      sol.shadow.camera.bottom = -alcance
      sol.shadow.camera.far = maqueta.radio * 5 + 40
      sol.shadow.camera.updateProjectionMatrix()
      escena.add(sol)

      let distancia = 20
      const encuadrar = () => {
        const ancho = contenedor.clientWidth
        const alto = contenedor.clientHeight
        if (!ancho || !alto) return
        renderer.setSize(ancho, alto, false)
        camara.aspect = ancho / alto
        const mitadVertical = (camara.fov * Math.PI) / 360
        const mitadHorizontal = Math.atan(Math.tan(mitadVertical) * camara.aspect)
        distancia = ((maqueta.radio + 3) / Math.sin(Math.min(mitadVertical, mitadHorizontal))) * 0.78
        camara.far = distancia * 4
        camara.updateProjectionMatrix()
      }

      const puntero = new Vector2()
      const raycaster = new Raycaster()
      const proyeccion = new Vector3()
      let hayPuntero = false
      let hoverId: number | null = null
      let giro = 0.65
      let desvioGiro = 0
      let desvioAltura = 0
      let reloj = 0
      let transcurrido = animarEntrada ? 0 : Number.POSITIVE_INFINITY
      let anterior = performance.now()
      let marco = 0
      let enPantalla = true

      const granjaBajo = (x: number, y: number): number | null => {
        raycaster.setFromCamera(new Vector2(x, y), camara)
        const impacto = raycaster.intersectObjects(seleccionables, false)[0]
        return typeof impacto?.object.userData.granjaId === 'number' ? impacto.object.userData.granjaId : null
      }

      const mostrarEtiqueta = (granjaId: number | null) => {
        const parcela = maqueta.parcelas.find(item => item.id === granjaId)
        lienzo.style.cursor = parcela ? 'pointer' : ''
        setEtiquetaVisible(Boolean(parcela))
        if (!parcela) return
        const galpones = parcela.galpones.length + parcela.galponesOcultos
        setEtiqueta({
          nombre: parcela.activa ? parcela.nombre : `${parcela.nombre} · Inactiva`,
          detalle: `${plural(galpones, 'galpón', 'galpones')} · ${plural(parcela.sensores, 'sensor', 'sensores')}`,
        })
      }

      const dibujar = (ahora: number) => {
        const delta = Math.min((ahora - anterior) / 1000, 0.05)
        anterior = ahora
        transcurrido += delta * 1000
        reloj += delta
        const foco = hoverId ?? resaltadaRef.current

        parcelas.forEach(parcela => {
          const progreso = easeOutCubic(limitar((transcurrido - parcela.retraso) / 650))
          parcela.elevacion += ((parcela.id === foco ? 1 : 0) - parcela.elevacion) * Math.min(delta * 9, 1)
          parcela.grupo.position.y = -0.9 * (1 - progreso) + parcela.elevacion * 0.2
          parcela.grupo.scale.set(0.7 + 0.3 * progreso, 1, 0.7 + 0.3 * progreso)
          parcela.contorno.opacity = parcela.elevacion * 0.45
        })
        entradas.forEach(({ nave, retraso }) => {
          const progreso = limitar((transcurrido - retraso) / 520)
          nave.scale.setScalar(Math.max(easeOutBack(progreso), 0.0001))
        })

        const segundos = transcurrido === Number.POSITIVE_INFINITY ? 0 : transcurrido / 1000
        balizas.forEach(baliza => {
          const fase = reducirMovimiento ? 0.45 : (segundos / 1.8 + baliza.fase) % 1
          baliza.anillo.scale.setScalar(1 + fase * 2.6)
          baliza.material.opacity = (1 - fase) * 0.85
        })
        if (!reducirMovimiento) {
          gallinas.forEach(({ objeto, giro, fase }) => {
            const tiempo = reloj + fase * 10
            objeto.position.y = Math.max(Math.sin(tiempo * 2.6), 0) ** 6 * 0.035
            objeto.rotation.y = giro + Math.sin(tiempo * 0.45 + fase * 6) * 0.9
          })
        }
        material.baliza.emissiveIntensity = reducirMovimiento ? 1.1 : 0.9 + Math.sin(ahora / 260) * 0.45

        if (!reducirMovimiento && hoverId === null) giro += delta * 0.07
        const objetivoGiro = hayPuntero && !reducirMovimiento ? puntero.x * 0.32 : 0
        const objetivoAltura = hayPuntero && !reducirMovimiento ? puntero.y * 0.1 : 0
        desvioGiro += (objetivoGiro - desvioGiro) * Math.min(delta * 3, 1)
        desvioAltura += (objetivoAltura - desvioAltura) * Math.min(delta * 3, 1)
        const angulo = giro + desvioGiro
        const inclinacion = INCLINACION_CAMARA + desvioAltura
        camara.position.set(
          Math.sin(angulo) * Math.cos(inclinacion) * distancia,
          Math.sin(inclinacion) * distancia,
          Math.cos(angulo) * Math.cos(inclinacion) * distancia,
        )
        camara.lookAt(0, 0.2, 0)
        camara.updateMatrixWorld()

        if (hayPuntero) {
          const encontrada = granjaBajo(puntero.x, puntero.y)
          if (encontrada !== hoverId) {
            hoverId = encontrada
            mostrarEtiqueta(encontrada)
          }
        }
        const parcelaFoco = parcelas.find(parcela => parcela.id === hoverId)
        if (parcelaFoco && etiquetaRef.current) {
          parcelaFoco.grupo.getWorldPosition(proyeccion)
          proyeccion.y += 1.25
          proyeccion.project(camara)
          const x = ((proyeccion.x + 1) / 2) * contenedor.clientWidth
          const y = ((1 - proyeccion.y) / 2) * contenedor.clientHeight
          etiquetaRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`
        }

        renderer.render(escena, camara)
      }

      const ciclo = (ahora: number) => {
        marco = requestAnimationFrame(ciclo)
        dibujar(ahora)
      }
      const arrancar = () => {
        if (marco || !enPantalla || document.hidden) return
        anterior = performance.now()
        marco = requestAnimationFrame(ciclo)
      }
      const detener = () => {
        cancelAnimationFrame(marco)
        marco = 0
      }

      const alMoverPuntero = (evento: PointerEvent) => {
        const caja = lienzo.getBoundingClientRect()
        puntero.set(((evento.clientX - caja.left) / caja.width) * 2 - 1, -((evento.clientY - caja.top) / caja.height) * 2 + 1)
        hayPuntero = true
      }
      const alSalirPuntero = () => {
        hayPuntero = false
        hoverId = null
        mostrarEtiqueta(null)
      }
      const alHacerClic = (evento: MouseEvent) => {
        const caja = lienzo.getBoundingClientRect()
        const granjaId = granjaBajo(((evento.clientX - caja.left) / caja.width) * 2 - 1, -((evento.clientY - caja.top) / caja.height) * 2 + 1)
        if (granjaId !== null) elegirRef.current(granjaId)
      }
      const alCambiarVisibilidad = () => (document.hidden ? detener() : arrancar())

      lienzo.addEventListener('pointermove', alMoverPuntero)
      lienzo.addEventListener('pointerleave', alSalirPuntero)
      lienzo.addEventListener('click', alHacerClic)
      document.addEventListener('visibilitychange', alCambiarVisibilidad)

      const redimension = new ResizeObserver(() => {
        encuadrar()
        if (!marco) dibujar(performance.now())
      })
      redimension.observe(contenedor)
      const visibilidad = new IntersectionObserver(([entrada]) => {
        enPantalla = entrada.isIntersecting
        if (enPantalla) arrancar()
        else detener()
      })
      visibilidad.observe(contenedor)

      encuadrar()
      dibujar(performance.now())
      arrancar()
      setLista(true)
      setConModeloGalpon(Boolean(modelos.galpon))
      setConGallinas(gallinas.length > 0)

      return () => {
        detener()
        redimension.disconnect()
        visibilidad.disconnect()
        document.removeEventListener('visibilitychange', alCambiarVisibilidad)
        lienzo.removeEventListener('pointermove', alMoverPuntero)
        lienzo.removeEventListener('pointerleave', alSalirPuntero)
        lienzo.removeEventListener('click', alHacerClic)
        desechables.forEach(recurso => recurso.dispose())
        sol.dispose()
        renderer.dispose()
        renderer.forceContextLoss()
        lienzo.remove()
      }
    }

    const contenedor = lienzoRef.current
    if (!contenedor) return
    let cancelado = false
    let desmontar: (() => void) | undefined
    void cargarModelosEscena().then((modelos) => {
      if (!cancelado) desmontar = montar(contenedor, modelos)
    })
    return () => {
      cancelado = true
      desmontar?.()
    }
  }, [firma, semilla])

  return (
    <div className={`org-escena${lista ? ' is-lista' : ''}`}>
      <div ref={lienzoRef} className="org-escena-lienzo" role="img" aria-label={descripcion} />
      {sinWebgl && (
        <p className="org-escena-sin-webgl">La vista 3D no está disponible en este navegador. El detalle de cada granja sigue abajo.</p>
      )}
      <div ref={etiquetaRef} className={`org-escena-etiqueta${etiqueta && etiquetaVisible ? ' is-visible' : ''}`} aria-hidden="true">
        {etiqueta && (
          <>
            <strong>{etiqueta.nombre}</strong>
            <span>{etiqueta.detalle}</span>
          </>
        )}
      </div>
      {conGallinas && (
        <a className="org-escena-credito" href={CREDITO_GALLINA.enlace} target="_blank" rel="noreferrer">{CREDITO_GALLINA.texto}</a>
      )}
      {!sinWebgl && (
        <ul className={`org-escena-leyenda${conModeloGalpon ? ' is-modelo' : ''}`} aria-hidden="true">
          <li><span className="org-escena-punto org-escena-punto--activo" />Galpón activo</li>
          <li><span className="org-escena-punto org-escena-punto--inactivo" />Inactivo</li>
          <li><span className="org-escena-punto org-escena-punto--sensor" />Con sensores</li>
        </ul>
      )}
    </div>
  )
}

export default EscenaOrganizacion
