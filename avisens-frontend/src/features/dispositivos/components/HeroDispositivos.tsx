import { type CSSProperties } from 'react'
import NumeroAnimado from '@features/organizaciones/components/NumeroAnimado'
import type { GranjaOrganizacionDetalle } from '@features/organizaciones/api/organizaciones'
import { hace } from '@shared/utils/fechas'
import fotoCampo from '../assets/dispositivos-campo.webp'
import '@shared/ui/movimiento.css'
import '@features/organizaciones/components/HeroOrganizacion.css'

const MAX_CHIPS_GRANJA = 4

type Indicador = { label: string; valor: number; tono: 'verde' | 'profundo' | 'amarillo' | 'naranja' }

type Props = {
  granjas: GranjaOrganizacionDetalle[]
  granjaResaltada: number | null
  conectados: number
  controladores: number
  sinReportar: number
  sinControlador: number
  sensores: number
  alDia: number | null
  versionPublicada: string | null
  ultimaSenal: string | null
  cargando: boolean
  onElegirGranja: (granjaId: number) => void
}

function HeroDispositivos({
  granjas, granjaResaltada, conectados, controladores, sinReportar, sinControlador, sensores, alDia,
  versionPublicada, ultimaSenal, cargando, onElegirGranja,
}: Props) {
  const todoEnLinea = controladores > 0 && conectados === controladores
  const granjasVisibles = granjas.slice(0, MAX_CHIPS_GRANJA)
  const granjasRestantes = Math.max(granjas.length - MAX_CHIPS_GRANJA, 0)
  const indicadores: Indicador[] = [
    { label: 'Controladores', valor: controladores, tono: 'profundo' },
    { label: 'En línea', valor: conectados, tono: 'verde' },
    { label: 'Sin reportar', valor: sinReportar, tono: 'naranja' },
    { label: 'Galpones sin equipo', valor: sinControlador, tono: 'amarillo' },
    { label: 'Sensores activos', valor: sensores, tono: 'verde' },
    { label: 'Firmware al día', valor: alDia ?? 0, tono: 'profundo' },
  ]

  return (
    <section className="org-hero" aria-labelledby="dsp-hero-titulo">
      <div className="org-hero-texto">
        <span className="adm-eyebrow org-aparece" style={{ '--orden': 0 } as CSSProperties}>
          <span className="adm-eyebrow-punto" aria-hidden="true" />
          Plataforma · Campo
        </span>
        <h1 id="dsp-hero-titulo" className="org-hero-titulo org-aparece" style={{ '--orden': 1 } as CSSProperties}>
          Dispositivos
        </h1>
        <div className="org-hero-chips org-aparece" style={{ '--orden': 2 } as CSSProperties}>
          <span className={`org-hero-chip org-hero-chip--estado${todoEnLinea ? ' is-activa' : ''}`}>
            <span className="org-hero-latido" aria-hidden="true" />
            {cargando ? 'Consultando…' : `${conectados} de ${controladores} en línea`}
          </span>
          <span className="org-hero-chip">{versionPublicada ? `Firmware v${versionPublicada}` : 'Sin firmware publicado'}</span>
        </div>
        <dl className="org-hero-datos org-aparece" style={{ '--orden': 3 } as CSSProperties}>
          <div><dt>Última señal</dt><dd>{ultimaSenal ? hace(ultimaSenal) : 'Ninguna todavía'}</dd></div>
          <div><dt>Granjas en campo</dt><dd>{granjas.length}</dd></div>
        </dl>
        <p className="org-hero-subtitulo org-aparece" style={{ '--orden': 4 } as CSSProperties}>
          Los controladores ESP32 de todas las granjas: su conexión, sus sensores y el firmware que llevan.
        </p>
      </div>

      <div className="org-hero-escena org-hero-escena--foto">
        <img
          className="org-hero-foto"
          src={fotoCampo}
          alt="Galpones avícolas monitoreados con dispositivos de campo Avisens"
          style={{ objectPosition: '56% 52%' }}
        />
        <p className="org-hero-escena-nota org-hero-escena-nota--foto">
          {granjas.length === 0 ? 'Sin granjas en campo todavía' : 'Toca una granja para ver sus galpones abajo.'}
        </p>
        {granjasVisibles.length > 0 && (
          <div className="org-hero-granjas" aria-label="Granjas en campo">
            {granjasVisibles.map((granja) => {
              const activa = granja.galpones.some((galpon) => galpon.activo)
              return (
                <button
                  key={granja.id}
                  type="button"
                  className={`org-hero-granja-pill${granjaResaltada === granja.id ? ' is-activa' : ''}`}
                  onClick={() => onElegirGranja(granja.id)}
                >
                  <span className={`org-hero-granja-punto${activa ? ' is-activa' : ''}`} aria-hidden="true" />
                  <span>{granja.nombre}</span>
                  <small>{granja.galpones.length}</small>
                </button>
              )
            })}
            {granjasRestantes > 0 && (
              <span className="org-hero-granja-mas">+{granjasRestantes} más</span>
            )}
          </div>
        )}
      </div>

      <ul className="org-hero-indicadores" aria-label="Resumen del campo">
        {indicadores.map((indicador, indice) => (
          <li
            key={indicador.label}
            className={`org-hero-indicador org-hero-indicador--${indicador.tono} org-aparece`}
            style={{ '--orden': indice + 3 } as CSSProperties}
          >
            <span className="org-hero-indicador-label">{indicador.label}</span>
            <strong className="org-hero-indicador-valor">
              <NumeroAnimado valor={indicador.valor} retrasoMs={180 + indice * 70} />
            </strong>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default HeroDispositivos
