import { lazy, Suspense, type CSSProperties } from 'react'
import NumeroAnimado from '@features/organizaciones/components/NumeroAnimado'
import type { GranjaOrganizacionDetalle } from '@features/organizaciones/api/organizaciones'
import { describirMaqueta } from '@features/organizaciones/model/maqueta'
import { IcRefresh } from '@shared/ui/icons/icons'
import { hace } from '@shared/utils/fechas'
import '@shared/ui/movimiento.css'
import '@features/organizaciones/components/HeroOrganizacion.css'

const EscenaOrganizacion = lazy(() => import('@features/organizaciones/components/EscenaOrganizacion'))

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
  onActualizar: () => void
}

function HeroDispositivos({
  granjas, granjaResaltada, conectados, controladores, sinReportar, sinControlador, sensores, alDia,
  versionPublicada, ultimaSenal, cargando, onElegirGranja, onActualizar,
}: Props) {
  const todoEnLinea = controladores > 0 && conectados === controladores
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
        <div className="org-hero-acciones org-aparece" style={{ '--orden': 5 } as CSSProperties}>
          <button type="button" className="adm-btn adm-btn--primario org-hero-actualizar" onClick={onActualizar} disabled={cargando}>
            <IcRefresh size={16} aria-hidden="true" />
            {cargando ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      <div className="org-hero-escena">
        <Suspense fallback={<div className="org-hero-escena-cargando" aria-hidden="true" />}>
          <EscenaOrganizacion
            granjas={granjas}
            semilla={7}
            descripcion={describirMaqueta('el campo de Avisens', granjas)}
            resaltadaId={granjaResaltada}
            alElegirGranja={onElegirGranja}
          />
        </Suspense>
        <p className="org-hero-escena-nota org-hero-escena-nota--pista">Toca una granja para ver sus galpones abajo.</p>
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
