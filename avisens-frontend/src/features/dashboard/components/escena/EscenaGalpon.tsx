import type { CSSProperties } from 'react'
import type { TonoGranja } from '../../model/estadoGranja'
import { estadoDeLampara, sombraDelGalpon, type Astro, type FaseDelDia } from '../../model/escenaGalpon'
import galponImagen from '../../assets/escena/galpon-v4-low-poly.webp'
import letreroImagen from '../../assets/escena/letrero-granja-low-poly.webp'
import PolloEscena, { type PolloUbicado } from './PolloEscena'

type Props = {
  nombreGalpon: string
  tono: TonoGranja
  diaLote: number | null
  aves: number
  astro: Astro
  fase: FaseDelDia
}

const ESCENA = { ancho: 760, alto: 484 }
const GALPON = { x: 100, y: 67.1, ancho: 600, alto: 383.9 }
const SUELO_Y = 451
const POLLO_ALTO = 26
const REGION_POLLOS = { x: 232, y: 318, ancho: 336, alto: 134 }
const BANDADA = [
  { fx: 0.37, fy: 0.885, giro: 0.9 }, { fx: 0.63, fy: 0.88, giro: -0.8 },
  { fx: 0.4, fy: 0.8, giro: 1.4 }, { fx: 0.6, fy: 0.79, giro: -1.2 },
  { fx: 0.425, fy: 0.735, giro: 0.4 }, { fx: 0.575, fy: 0.73, giro: -0.5 },
  { fx: 0.255, fy: 0.925, giro: 1 }, { fx: 0.745, fy: 0.92, giro: -1 },
]

function ubicarBandada(): PolloUbicado[] {
  return BANDADA.map(({ fx, fy, giro }) => ({
    x: GALPON.x + fx * GALPON.ancho,
    y: GALPON.y + fy * GALPON.alto,
    alto: POLLO_ALTO * Math.min(1.15, Math.max(0.4, (fy - 0.6) / 0.29)),
    giro,
  }))
}

const POLLOS = ubicarBandada()
const BOMBILLOS: [number, number, number][] = [
  [0.338, 0.452, 11], [0.662, 0.452, 11], [0.376, 0.516, 8.5], [0.624, 0.516, 8.5],
  [0.4, 0.553, 6.5], [0.6, 0.553, 6.5], [0.418, 0.585, 5], [0.582, 0.585, 5],
]
const LETRERO = { x: 8, ancho: 124, base: 474, relacion: 1724 / 772 }

const ARBUSTOS = [
  { x: -30, r: 46, lejos: true }, { x: 22, r: 38, lejos: true }, { x: 70, r: 30, lejos: true },
  { x: 0, r: 30, lejos: false }, { x: 48, r: 24, lejos: false },
  { x: 726, r: 32, lejos: true }, { x: 772, r: 44, lejos: true }, { x: 826, r: 36, lejos: true },
  { x: 748, r: 24, lejos: false }, { x: 796, r: 30, lejos: false },
]

const porcentajeX = (x: number) => `${((x / ESCENA.ancho) * 100).toFixed(3)}%`
const porcentajeY = (y: number) => `${((y / ESCENA.alto) * 100).toFixed(3)}%`

function EscenaGalpon({ nombreGalpon, tono, diaLote, aves, astro, fase }: Props) {
  const lampara = estadoDeLampara(tono)
  const sombra = sombraDelGalpon(astro)
  const descripcion = aves > 0
    ? `Galpón de ${nombreGalpon} con ${aves.toLocaleString('es-CO')} aves${diaLote === null ? '' : ` en el día ${diaLote}`}`
    : `Galpón de ${nombreGalpon}, sin aves por ahora`
  const centroSombra = 400 + sombra.desplazamiento * 70

  return (
    <div className={`escena escena--${lampara.color}`}>
      <div
        className="escena-lienzo"
        role="group"
        aria-label={descripcion}
        style={{ '--forma-galpon': `url(${galponImagen})` } as CSSProperties}
      >
        <svg className="escena-capa escena-suelo" viewBox={`0 0 ${ESCENA.ancho} ${ESCENA.alto}`} aria-hidden="true" overflow="visible">
          <defs>
            <filter id="escena-sombra" x="-20%" y="-200%" width="140%" height="500%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
            <radialGradient id="escena-luz">
              <stop offset="0" stopColor="#ffd98a" stopOpacity="0.95" />
              <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g aria-hidden="true">
            {ARBUSTOS.map((arbusto) => (
              <circle
                key={`${arbusto.x}-${arbusto.r}`}
                className={arbusto.lejos ? 'escena-seto escena-seto--lejos' : 'escena-seto'}
                cx={arbusto.x}
                cy={SUELO_Y - arbusto.r * 0.45}
                r={arbusto.r}
              />
            ))}
          </g>
          <rect className="escena-piso" x="-1600" y={SUELO_Y} width="4000" height="260" />
          <rect className="escena-piso-borde" x="-1600" y={SUELO_Y} width="4000" height="4" />
          <ellipse
            className="escena-sombra"
            cx={centroSombra}
            cy={SUELO_Y + 3}
            rx={GALPON.ancho * 0.52 * sombra.alargamiento}
            ry="11"
            filter="url(#escena-sombra)"
          />
          <ellipse className="escena-luz-piso" cx="400" cy={SUELO_Y + 10} rx="210" ry="18" fill="url(#escena-luz)" />
        </svg>

        <img
          className="escena-galpon"
          src={galponImagen}
          alt=""
          aria-hidden="true"
          style={{
            left: porcentajeX(GALPON.x), top: porcentajeY(GALPON.y),
            width: porcentajeX(GALPON.ancho), height: porcentajeY(GALPON.alto),
          }}
        />
        <span
          className="escena-tinte"
          aria-hidden="true"
          style={{
            left: porcentajeX(GALPON.x), top: porcentajeY(GALPON.y),
            width: porcentajeX(GALPON.ancho), height: porcentajeY(GALPON.alto),
          }}
        />
        <span
          className="escena-interior"
          aria-hidden="true"
          style={{
            left: porcentajeX(GALPON.x), top: porcentajeY(GALPON.y),
            width: porcentajeX(GALPON.ancho), height: porcentajeY(GALPON.alto),
          }}
        />
        {BOMBILLOS.map(([fx, fy, tam]) => (
          <span
            key={`${fx}-${fy}`}
            className="escena-bombillo"
            aria-hidden="true"
            style={{
              left: porcentajeX(GALPON.x + fx * GALPON.ancho), top: porcentajeY(GALPON.y + fy * GALPON.alto),
              '--tam': tam,
            } as CSSProperties}
          />
        ))}

        {aves > 0 && <PolloEscena pollos={POLLOS} region={REGION_POLLOS} escena={ESCENA} fase={fase} astro={astro} />}

        <svg className="escena-capa escena-dibujo" viewBox={`0 0 ${ESCENA.ancho} ${ESCENA.alto}`} aria-hidden="true">
          <path d="M400 67V51" stroke="var(--techo-sombra)" strokeWidth="3" strokeLinecap="round" />
          <circle className={lampara.pulsa ? 'escena-halo escena-halo--pulsa' : 'escena-halo'} cx="400" cy="42" r="15" fill="var(--lampara)" />
          <circle className="escena-lampara" cx="400" cy="42" r="7.5" fill="var(--lampara)" stroke="var(--contorno)" strokeWidth="1.8" />
        </svg>

        <div
          className="escena-letrero"
          style={{
            left: porcentajeX(LETRERO.x),
            top: porcentajeY(LETRERO.base - LETRERO.ancho / LETRERO.relacion),
            width: porcentajeX(LETRERO.ancho),
          }}
        >
          <img src={letreroImagen} alt="" aria-hidden="true" />
          <span
            className="escena-letrero-nombre"
            title={nombreGalpon}
            style={{ fontSize: `${Math.min(15, 80 / (0.6 * Math.max(nombreGalpon.length, 1))).toFixed(2)}cqw` }}
          >
            <span>{nombreGalpon}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

export default EscenaGalpon
