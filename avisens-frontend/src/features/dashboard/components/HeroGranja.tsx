import { useEffect, useRef, useState } from 'react'
import { IcArrowRight, IcRefresh } from '@shared/ui/icons/icons'
import type { DashboardGranja } from '../model/dashboard'
import type { EstadoGranja } from '../model/estadoGranja'
import { detalleDeKpi, faseDelDia, lecturaDeSensor, posicionDelAstro, type SensorEscena } from '../model/escenaGalpon'
import type { KpiGranja } from '../model/resumenGranja'
import lunaLowPoly from '../assets/escena/luna-low-poly.webp'
import solLowPoly from '../assets/escena/sol-low-poly.webp'
import EscenaGalpon from './escena/EscenaGalpon'
import './HeroGranja.css'

type Props = {
  nombre: string
  fecha: string
  granjas: DashboardGranja[]
  granjaId: number | null
  estado: EstadoGranja
  kpis: KpiGranja[]
  diaLote: number | null
  aves: number
  nombreGalpon: string | null
  sensores: SensorEscena[]
  cargando: boolean
  hora?: number
  onGranjaChange: (id: number) => void
  onRecargar: () => void
  onAccion: () => void
  onNavegar: (destino: string) => void
}

const TEXTO_ACCION = {
  atencion: 'Revisar ahora',
  guia: 'Ver la guía de crecimiento',
} as const

const MINUTOS_ENTRE_RELOJES = 5
const ORDEN_INDICADORES: KpiGranja['id'][] = ['aves', 'alertas', 'sensores', 'galpones']
const NUBES = [
  { izquierda: 41, arriba: 13, ancho: 110, retraso: 0 },
  { izquierda: 84, arriba: 36, ancho: 92, retraso: -22 },
]
const ESTRELLAS = [
  [6, 14], [14, 36], [22, 10], [31, 28], [39, 8], [47, 20], [55, 12], [63, 32],
  [71, 9], [78, 24], [85, 14], [92, 30], [95, 8], [27, 44],
]

function horaLocal(): number {
  const ahora = new Date()
  return ahora.getHours() + ahora.getMinutes() / 60
}

function useHoraLocal(forzada?: number): number {
  const [hora, setHora] = useState(horaLocal)
  useEffect(() => {
    if (forzada !== undefined) return
    const reloj = window.setInterval(() => setHora(horaLocal()), MINUTOS_ENTRE_RELOJES * 60_000)
    return () => window.clearInterval(reloj)
  }, [forzada])
  return forzada ?? hora
}

function useParalaje(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const elemento = ref.current
    if (!elemento) return
    const fino = window.matchMedia('(hover: hover) and (pointer: fine)')
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!fino.matches || quieto.matches) return

    let cuadro = 0
    const mover = (evento: PointerEvent) => {
      if (cuadro) return
      cuadro = window.requestAnimationFrame(() => {
        cuadro = 0
        const caja = elemento.getBoundingClientRect()
        const x = ((evento.clientX - caja.left) / caja.width - 0.5) * 2
        const y = ((evento.clientY - caja.top) / caja.height - 0.5) * 2
        elemento.style.setProperty('--px', x.toFixed(3))
        elemento.style.setProperty('--py', y.toFixed(3))
      })
    }
    const centrar = () => {
      elemento.style.setProperty('--px', '0')
      elemento.style.setProperty('--py', '0')
    }
    elemento.addEventListener('pointermove', mover)
    elemento.addEventListener('pointerleave', centrar)
    return () => {
      elemento.removeEventListener('pointermove', mover)
      elemento.removeEventListener('pointerleave', centrar)
      if (cuadro) window.cancelAnimationFrame(cuadro)
    }
  }, [ref])
}

function HeroGranja({
  nombre, fecha, granjas, granjaId, estado, kpis, diaLote, aves, nombreGalpon, sensores,
  cargando, hora, onGranjaChange, onRecargar, onAccion, onNavegar,
}: Props) {
  const raiz = useRef<HTMLElement>(null)
  const [resaltado, setResaltado] = useState<KpiGranja['id'] | null>(null)
  useParalaje(raiz)
  const horaActual = useHoraLocal(hora)
  const fase = faseDelDia(horaActual)
  const astro = posicionDelAstro(horaActual)
  const granja = granjas.find((item) => item.id === granjaId)
  const temperatura = sensores.find((sensor) => sensor.clase === 'temperatura' && sensor.valor !== null)
  const ambiente = temperatura ? lecturaDeSensor(temperatura) : null
  const indicadores = ORDEN_INDICADORES.flatMap((clave) => kpis.filter((kpi) => kpi.id === clave))

  return (
    <section
      ref={raiz}
      className={`hero-granja hero-granja--${estado.tono}`}
      data-fase={fase}
      data-resaltado={resaltado ?? undefined}
      aria-labelledby="hero-granja-titulo"
    >
      <div className="hero-granja-fondo" aria-hidden="true">
        {fase === 'noche' && ESTRELLAS.map(([izquierda, arriba], indice) => (
          <span key={indice} className="hero-granja-estrella" style={{ left: `${izquierda}%`, top: `${arriba}%`, animationDelay: `${(indice % 5) * -0.9}s` }} />
        ))}
        <span
          key={`halo-${astro.tipo}`}
          className={`hero-granja-halo hero-granja-halo--${astro.tipo}`}
          style={{ left: `${astro.x}%`, top: `${astro.y}%` }}
        />
        <img
          key={astro.tipo}
          className={`hero-granja-astro hero-granja-astro--${astro.tipo}`}
          src={astro.tipo === 'sol' ? solLowPoly : lunaLowPoly}
          alt=""
          style={{ left: `${astro.x}%`, top: `${astro.y}%` }}
        />
        {fase !== 'noche' && NUBES.map((nube) => (
          <svg
            key={nube.izquierda}
            className="hero-granja-nube"
            viewBox="0 0 120 40"
            style={{ left: `${nube.izquierda}%`, top: `${nube.arriba}%`, width: nube.ancho, animationDelay: `${nube.retraso}s` }}
          >
            <path d="M14 36a14 14 0 0 1 2-27a22 22 0 0 1 42-4a18 18 0 0 1 32 8a15 15 0 0 1 14 23z" />
          </svg>
        ))}
        <svg className="hero-granja-colinas" viewBox="0 0 1200 220" preserveAspectRatio="none">
          <path className="hero-granja-cordillera" d="M0 96L90 58L150 84L250 30L330 76L420 44L520 92L640 36L730 82L850 50L960 98L1060 56L1200 92V220H0z" />
          <path className="hero-granja-colina-lejos" d="M0 120C120 70 240 60 380 96S620 150 780 98S1060 40 1200 84V220H0z" />
          <path className="hero-granja-colina-cerca" d="M0 160C150 118 280 128 430 150S720 190 880 146S1100 112 1200 140V220H0z" />
        </svg>
      </div>

      <div className="hero-granja-controles">
        <p className="hero-granja-pie">
          Hola, {nombre} · <time>{fecha}</time>
        </p>
        {granjas.length > 1 && (
          <label className="hero-granja-selector">
            <span className="sr-only">Granja</span>
            <select value={granjaId ?? ''} onChange={(evento) => onGranjaChange(Number(evento.target.value))}>
              {granjas.map((item) => (
                <option key={item.id} value={item.id}>{item.nombre}</option>
              ))}
            </select>
          </label>
        )}
        <button type="button" className={`hero-granja-sync${cargando ? ' is-spinning' : ''}`} onClick={onRecargar} disabled={cargando}>
          <IcRefresh size={14} aria-hidden="true" />
          <span>{cargando ? 'Actualizando…' : 'Actualizar'}</span>
        </button>
      </div>

      <div className="hero-granja-cuerpo">
        <h1 id="hero-granja-titulo" className="hero-granja-titulo">{estado.titulo}</h1>
        <p className="hero-granja-detalle">{estado.detalle}</p>
        {estado.accion && (
          <button type="button" className="hero-granja-accion" onClick={onAccion}>
            {TEXTO_ACCION[estado.accion.tipo]}
            <IcArrowRight size={15} aria-hidden="true" />
          </button>
        )}

        <ul className="hero-granja-indicadores" aria-label="Indicadores de la granja" aria-busy={cargando}>
          {indicadores.map((kpi) => (
            <li key={kpi.id}>
              <button
                type="button"
                className={`hero-granja-indicador hero-granja-indicador--${kpi.id}`}
                onClick={() => onNavegar(kpi.destino)}
                onMouseEnter={() => setResaltado(kpi.id)}
                onMouseLeave={() => setResaltado(null)}
                onFocus={() => setResaltado(kpi.id)}
                onBlur={() => setResaltado(null)}
              >
                <span className="hero-granja-indicador-etiqueta">
                  <span className="hero-granja-indicador-punto" aria-hidden="true" />
                  {kpi.etiqueta}
                </span>
                <strong>{kpi.valor}</strong>
                <span className="hero-granja-indicador-detalle">{detalleDeKpi(kpi, diaLote, ambiente)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <EscenaGalpon
        nombreGalpon={nombreGalpon ?? granja?.nombre ?? 'Tu galpón'}
        tono={estado.tono}
        diaLote={diaLote}
        aves={aves}
        astro={astro}
        fase={fase}
      />
    </section>
  )
}

export default HeroGranja
