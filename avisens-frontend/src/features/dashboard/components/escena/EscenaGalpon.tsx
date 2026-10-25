import { useId } from 'react'
import type { CSSProperties } from 'react'
import Pollito from '@shared/ui/ilustraciones/Pollito'
import type { TonoGranja } from '../../model/estadoGranja'
import type { KpiGranja } from '../../model/resumenGranja'
import {
  colorDeEdad, escalaDelPollito, estadoDeLampara, etiquetaDeKpi, nivelDelTermometro,
  pollitosVisibles, posicionesDePollitos,
} from '../../model/escenaGalpon'

type Props = {
  nombreGranja: string
  tono: TonoGranja
  diaLote: number | null
  aves: number
  semilla: number
  temperatura: number | null
  humedad: number | null
  sensoresActivos: boolean
  kpis: KpiGranja[]
  onNavegar: (destino: string) => void
}

const PISO = { izquierda: 112, ancho: 540, fondo: 298, profundidad: 32 }
const ESCALA_PINTADA = 1.3
const COMEDEROS = [170, 260, 350, 440, 530, 600]
const BEBEDEROS = [215, 305, 395, 485, 565]
const TERMOMETRO = { x: 604, arriba: 190, alto: 58 }
const LARGO_MAXIMO_LETRERO = 11

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

function letrero(nombre: string): string {
  const limpio = nombre.trim()
  return limpio.length > LARGO_MAXIMO_LETRERO ? `${limpio.slice(0, LARGO_MAXIMO_LETRERO - 1)}…` : limpio
}

function EscenaGalpon({
  nombreGranja, tono, diaLote, aves, semilla, temperatura, humedad, sensoresActivos, kpis, onNavegar,
}: Props) {
  const id = useId().replace(/:/g, '')
  const lampara = estadoDeLampara(tono)
  const nivel = nivelDelTermometro(temperatura)
  const escala = escalaDelPollito(diaLote)
  const pollitos = posicionesDePollitos(pollitosVisibles(aves), semilla)
  const kpiPorId = new Map(kpis.map((kpi) => [kpi.id, kpi]))
  const ambiente = temperatura === null
    ? null
    : `${decimal.format(temperatura)} °C${humedad === null ? '' : ` · ${Math.round(humedad)} %`}`
  const descripcion = aves > 0
    ? `Corte del galpón de ${nombreGranja} con ${aves.toLocaleString('es-CO')} aves${diaLote === null ? '' : ` en el día ${diaLote}`}`
    : `Corte del galpón de ${nombreGranja}, sin aves por ahora`

  return (
    <div
      className={`escena escena--${lampara.color}`}
      style={{ '--edad': colorDeEdad(diaLote) } as CSSProperties}
    >
      <div className="escena-lienzo">
        <svg viewBox="0 0 760 440" className="escena-svg" role="img" aria-label={descripcion} overflow="visible">
          <defs>
            <pattern id={`viruta-${id}`} width="30" height="14" patternUnits="userSpaceOnUse">
              <path d="M3 4h9M17 10h8" stroke="var(--cama-sombra)" strokeWidth="2" strokeLinecap="round" />
            </pattern>
          </defs>

          <rect x="-1600" y="332" width="4000" height="200" fill="var(--suelo)" />
          <rect x="-1600" y="332" width="4000" height="5" fill="var(--cesped)" />

          <rect x="94" y="150" width="572" height="182" fill="var(--pared)" />
          <polygon points="94,150 380,86 666,150" fill="var(--pared-alta)" />
          <rect x="94" y="304" width="572" height="28" fill="var(--cama)" />
          <rect x="94" y="304" width="572" height="28" fill={`url(#viruta-${id})`} />
          <path d="M94 304h572" stroke="var(--cama-sombra)" strokeWidth="1.5" opacity="0.5" />

          <g stroke="var(--madera)" strokeLinecap="round" fill="none">
            <path d="M94 150L380 98L666 150" strokeWidth="3" />
            <path d="M94 150H666" strokeWidth="4" />
            <path d="M380 98V150" strokeWidth="3" />
            <path d="M237 124V150M523 124V150" strokeWidth="2" opacity="0.7" />
          </g>

          <rect x="94" y="152" width="26" height="66" rx="3" fill="var(--cortina)" />
          <rect x="640" y="152" width="26" height="66" rx="3" fill="var(--cortina)" />
          <path d="M98 166h18M98 180h18M98 194h18M98 208h18M644 166h18M644 180h18M644 194h18M644 208h18" stroke="var(--cortina-sombra)" strokeWidth="1.5" strokeLinecap="round" />

          <g stroke="var(--madera)" strokeLinecap="round">
            <path d="M130 212H630" strokeWidth="3" />
            {COMEDEROS.map((x) => <path key={`c${x}`} d={`M${x} 150V212`} strokeWidth="1.5" opacity="0.7" />)}
            <path d="M160 250H610" strokeWidth="2.5" />
            {BEBEDEROS.map((x) => <path key={`b${x}`} d={`M${x} 150V250`} strokeWidth="1.5" opacity="0.7" />)}
          </g>
          {COMEDEROS.map((x) => (
            <g key={`p${x}`}>
              <path d={`M${x - 10} 212L${x - 17} 225h34L${x + 10} 212z`} fill="var(--comedero-claro)" />
              <ellipse cx={x} cy="225" rx="17" ry="4.5" fill="var(--comedero)" />
            </g>
          ))}
          {BEBEDEROS.map((x) => <circle key={`t${x}`} cx={x} cy="258" r="4.5" fill="var(--agua)" />)}

          <path d="M380 150V174" stroke="var(--madera)" strokeWidth="2" />
          <circle cx="380" cy="184" r="24" fill="var(--bombillo)" opacity="var(--luz-bombillo)" />
          <circle cx="380" cy="184" r="8" fill="var(--bombillo)" />

          <rect x={TERMOMETRO.x - 4} y={TERMOMETRO.arriba} width="8" height={TERMOMETRO.alto + 4} rx="4" fill="var(--termometro)" stroke="var(--linea-objeto)" strokeWidth="1.5" />
          <circle cx={TERMOMETRO.x} cy={TERMOMETRO.arriba + TERMOMETRO.alto + 8} r="8" fill="var(--termometro)" stroke="var(--linea-objeto)" strokeWidth="1.5" />
          {nivel !== null && (
            <g fill="var(--mercurio)">
              <circle cx={TERMOMETRO.x} cy={TERMOMETRO.arriba + TERMOMETRO.alto + 8} r="5.5" />
              <rect
                className="escena-mercurio"
                x={TERMOMETRO.x - 1.75}
                y={TERMOMETRO.arriba + TERMOMETRO.alto + 8 - nivel * (TERMOMETRO.alto - 2)}
                width="3.5"
                height={nivel * (TERMOMETRO.alto - 2)}
                rx="1.75"
              />
            </g>
          )}

          <rect x="498" y="186" width="24" height="32" rx="4" fill="var(--sensor)" stroke="var(--linea-objeto)" strokeWidth="1.5" />
          <circle cx="510" cy="206" r="3" fill={sensoresActivos ? 'var(--led-activo)' : 'var(--linea-objeto)'} />
          <path d="M510 186V172" stroke="var(--linea-objeto)" strokeWidth="2" strokeLinecap="round" />
          <g className={sensoresActivos ? 'escena-ondas' : undefined} fill="none" stroke="var(--led-activo)" strokeWidth="2" strokeLinecap="round">
            <path d="M504 168a8 8 0 0 1 12 0" />
            <path d="M499 162a15 15 0 0 1 22 0" />
            <path d="M494 156a22 22 0 0 1 32 0" />
          </g>

          <rect x="84" y="148" width="12" height="184" fill="var(--techo-sombra)" />
          <rect x="664" y="148" width="12" height="184" fill="var(--techo-sombra)" />
          <polygon points="58,156 380,60 702,156 702,174 380,78 58,174" fill="var(--techo)" />
          <polygon points="58,156 380,60 702,156 702,163 380,67 58,163" fill="var(--techo-luz)" opacity="0.4" />
          <rect x="354" y="50" width="52" height="13" rx="3" fill="var(--techo-sombra)" />

          <path d="M380 50V34" stroke="var(--techo-sombra)" strokeWidth="3" strokeLinecap="round" />
          <circle className={lampara.pulsa ? 'escena-halo escena-halo--pulsa' : 'escena-halo'} cx="380" cy="27" r="15" fill="var(--lampara)" />
          <circle cx="380" cy="27" r="7.5" fill="var(--lampara)" stroke="var(--pared)" strokeWidth="1.5" />

          <g>
            {pollitos.map((pollito, indice) => (
              <Pollito
                key={indice}
                x={PISO.izquierda + pollito.x * PISO.ancho}
                y={PISO.fondo + pollito.fila * PISO.profundidad}
                escala={escala * pollito.perspectiva * ESCALA_PINTADA}
                mirada={pollito.mirada}
                retraso={pollito.retraso}
              />
            ))}
          </g>


          <g className="escena-guias" fill="none" stroke="var(--hero-texto)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M366 27H334" />
            <path d="M610 52L514 186" />
            <path d="M380 372V336" />
          </g>
          <g fill="var(--hero-texto)">
            <circle cx="370" cy="27" r="3" />
            <circle cx="512" cy="189" r="3" />
            <circle cx="380" cy="334" r="3" />
          </g>

          <g stroke="var(--madera)" strokeWidth="5" strokeLinecap="round">
            <path d="M28 268V334M104 268V334" />
          </g>
          <rect x="14" y="236" width="104" height="42" rx="6" fill="var(--letrero)" stroke="var(--madera)" strokeWidth="2.5" />
          <text x="66" y="262" textAnchor="middle" className="escena-letrero">{letrero(nombreGranja)}</text>

          <g fill="none" stroke="var(--cesped-oscuro)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M150 337q2-11 7-15M156 337q-1-9-5-13M162 337q3-8 8-10" />
            <path d="M690 337q2-11 7-15M696 337q-1-9-5-13M702 337q3-8 8-10" />
            <path d="M-40 337q2-11 7-15M-34 337q-1-9-5-13" />
            <path d="M240 405q2-11 7-15M246 405q-1-9-5-13M252 405q3-8 8-10" />
            <path d="M560 412q2-11 7-15M566 412q-1-9-5-13M572 412q3-8 8-10" />
            <path d="M12 420q2-11 7-15M18 420q-1-9-5-13" />
          </g>
        </svg>

        <ul className="escena-etiquetas" aria-label="Indicadores de la granja">
          {(['alertas', 'aves', 'sensores', 'galpones'] as const).map((clave) => {
            const kpi = kpiPorId.get(clave)
            if (!kpi) return null
            const texto = clave === 'sensores' && ambiente ? `${ambiente} · ${kpi.valor} sensores` : etiquetaDeKpi(kpi, diaLote)
            return (
              <li key={clave} className={`escena-etiqueta escena-etiqueta--${clave}`}>
                <button type="button" onClick={() => onNavegar(kpi.destino)}>
                  <span className="escena-etiqueta-punto" aria-hidden="true" />
                  <span className="escena-etiqueta-texto">
                    <strong>{texto}</strong>
                    <span>{kpi.detalle}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default EscenaGalpon
