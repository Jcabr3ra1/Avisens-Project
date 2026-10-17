import { lazy, Suspense, type CSSProperties, type ReactNode } from 'react'
import { IcAlert, IcHome, IcLeaf, IcRefresh, IcServer, IcThermo, IcUsers } from '@shared/ui/icons/icons'
import type { OrganizacionDetalle } from '../api/organizaciones'
import { describirMaqueta, MAX_GRANJAS_MAQUETA } from '../model/maqueta'
import { etiquetaPlan, fechaCorta } from '../model/organizacion'
import NumeroAnimado from './NumeroAnimado'
import '@shared/ui/movimiento.css'
import './HeroOrganizacion.css'

const EscenaOrganizacion = lazy(() => import('./EscenaOrganizacion'))

interface Props {
  detalle: OrganizacionDetalle
  resaltadaId: number | null
  alElegirGranja: (granjaId: number) => void
  alActualizar: () => void
  alVolver: () => void
}

interface Indicador {
  label: string
  valor: number
  icono: ReactNode
  tono: 'verde' | 'profundo' | 'amarillo' | 'naranja'
}

function HeroOrganizacion({ detalle, resaltadaId, alElegirGranja, alActualizar, alVolver }: Props) {
  const galpones = detalle.granjas.flatMap(granja => granja.galpones)
  const indicadores: Indicador[] = [
    { label: 'Granjas', valor: detalle._count.granjas, icono: <IcLeaf size={18} />, tono: 'verde' },
    { label: 'Galpones', valor: galpones.length, icono: <IcHome size={18} />, tono: 'profundo' },
    { label: 'Controladores', valor: galpones.reduce((suma, galpon) => suma + galpon._count.dispositivo, 0), icono: <IcServer size={18} />, tono: 'profundo' },
    { label: 'Sensores', valor: galpones.reduce((suma, galpon) => suma + galpon._count.sensores, 0), icono: <IcThermo size={18} />, tono: 'amarillo' },
    { label: 'Personas', valor: detalle._count.usuarios, icono: <IcUsers size={18} />, tono: 'verde' },
    {
      label: 'Recuperaciones',
      valor: detalle.usuarios.reduce((suma, usuario) => suma + usuario._count.recuperaciones_solicitadas, 0),
      icono: <IcAlert size={18} />,
      tono: 'naranja',
    },
  ]
  const granjasFuera = Math.max(detalle.granjas.length - MAX_GRANJAS_MAQUETA, 0)

  return (
    <section className="org-hero" aria-labelledby="org-hero-titulo">
      <div className="org-hero-texto">
        <span className="adm-eyebrow org-aparece" style={{ '--orden': 0 } as CSSProperties}>
          <span className="adm-eyebrow-punto" aria-hidden="true" />
          Ficha de organización
        </span>
        <h1 id="org-hero-titulo" className="org-hero-titulo org-aparece" style={{ '--orden': 1 } as CSSProperties}>
          {detalle.nombre}
        </h1>
        <div className="org-hero-chips org-aparece" style={{ '--orden': 2 } as CSSProperties}>
          <span className={`org-hero-chip org-hero-chip--estado${detalle.activa ? ' is-activa' : ''}`}>
            <span className="org-hero-latido" aria-hidden="true" />
            {detalle.activa ? 'Activa' : 'Suspendida'}
          </span>
          <span className="org-hero-chip">Plan {etiquetaPlan(detalle.plan)}</span>
        </div>
        <dl className="org-hero-datos org-aparece" style={{ '--orden': 3 } as CSSProperties}>
          <div><dt>NIT</dt><dd>{detalle.nit ?? 'Sin NIT registrado'}</dd></div>
          <div><dt>Cliente desde</dt><dd>{fechaCorta(detalle.fecha_creacion)}</dd></div>
        </dl>
        <p className="org-hero-subtitulo org-aparece" style={{ '--orden': 4 } as CSSProperties}>
          Personas, granjas y galpones relacionados con la organización mediante los vínculos existentes en Avisens.
        </p>
        <div className="org-hero-acciones org-aparece" style={{ '--orden': 5 } as CSSProperties}>
          <button type="button" className="adm-btn adm-btn--primario org-hero-actualizar" onClick={alActualizar}>
            <IcRefresh size={16} aria-hidden="true" />
            Actualizar
          </button>
          <button type="button" className="adm-btn adm-btn--secundario" onClick={alVolver}>
            Volver
          </button>
        </div>
      </div>

      <div className="org-hero-escena">
        <Suspense fallback={<div className="org-hero-escena-cargando" aria-hidden="true" />}>
          <EscenaOrganizacion
            granjas={detalle.granjas}
            semilla={detalle.id}
            descripcion={describirMaqueta(detalle.nombre, detalle.granjas)}
            resaltadaId={resaltadaId}
            alElegirGranja={alElegirGranja}
          />
        </Suspense>
        {detalle.granjas.length === 0 ? (
          <p className="org-hero-escena-nota">La maqueta crecerá cuando la organización registre su primera granja.</p>
        ) : (
          <p className="org-hero-escena-nota org-hero-escena-nota--pista">
            {granjasFuera > 0 ? `Se muestran ${MAX_GRANJAS_MAQUETA} granjas de ${detalle.granjas.length}. ` : ''}
            Toca una granja para ver su ficha.
          </p>
        )}
      </div>

      <ul className="org-hero-indicadores" aria-label={`Resumen de ${detalle.nombre}`}>
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

export default HeroOrganizacion
