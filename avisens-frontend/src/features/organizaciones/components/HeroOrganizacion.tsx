import { type CSSProperties, type ReactNode } from 'react'
import { IcAlert, IcHome, IcLeaf, IcServer, IcThermo, IcUsers } from '@shared/ui/icons/icons'
import type { OrganizacionDetalle } from '../api/organizaciones'
import { etiquetaPlan, fechaCorta } from '../model/organizacion'
import fotoOrganizacion from '../assets/organizacion-granja.webp'
import NumeroAnimado from './NumeroAnimado'
import '@shared/ui/movimiento.css'
import './HeroOrganizacion.css'

const MAX_CHIPS_GRANJA = 4

interface Props {
  detalle: OrganizacionDetalle
  resaltadaId: number | null
  alElegirGranja: (granjaId: number) => void
  alVolver: () => void
}

interface Indicador {
  label: string
  valor: number
  icono: ReactNode
  tono: 'verde' | 'profundo' | 'amarillo' | 'naranja'
}

function HeroOrganizacion({ detalle, resaltadaId, alElegirGranja, alVolver }: Props) {
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
  const granjasVisibles = detalle.granjas.slice(0, MAX_CHIPS_GRANJA)
  const granjasRestantes = Math.max(detalle.granjas.length - MAX_CHIPS_GRANJA, 0)
  const etiquetaResumen = detalle.granjas.length === 0
    ? 'Sin granjas registradas aún'
    : `${detalle._count.granjas} ${detalle._count.granjas === 1 ? 'granja' : 'granjas'} · ${galpones.length} ${galpones.length === 1 ? 'galpón' : 'galpones'}`

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
          <button type="button" className="adm-btn adm-btn--secundario" onClick={alVolver}>
            Volver
          </button>
        </div>
      </div>

      <div className="org-hero-escena org-hero-escena--foto">
        <img
          className="org-hero-foto"
          src={fotoOrganizacion}
          alt={`Operación avícola de ${detalle.nombre}`}
        />
        <p className="org-hero-escena-nota org-hero-escena-nota--foto">{etiquetaResumen}</p>
        {granjasVisibles.length > 0 && (
          <div className="org-hero-granjas" aria-label="Granjas de la organización">
            {granjasVisibles.map((granja) => {
              const activa = granja.galpones.some((galpon) => galpon.activo)
              return (
                <button
                  key={granja.id}
                  type="button"
                  className={`org-hero-granja-pill${resaltadaId === granja.id ? ' is-activa' : ''}`}
                  onClick={() => alElegirGranja(granja.id)}
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
