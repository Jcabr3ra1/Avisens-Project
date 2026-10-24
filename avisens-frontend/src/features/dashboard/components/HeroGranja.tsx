import { IcArrowRight, IcRefresh } from '@shared/ui/icons/icons'
import type { DashboardGranja } from '../model/dashboard'
import type { EstadoGranja } from '../model/estadoGranja'
import type { KpiGranja } from '../model/resumenGranja'

type Props = {
  nombre: string
  fecha: string
  granjas: DashboardGranja[]
  granjaId: number | null
  estado: EstadoGranja
  kpis: KpiGranja[]
  cargando: boolean
  onGranjaChange: (id: number) => void
  onRecargar: () => void
  onAccion: () => void
  onNavegar: (destino: string) => void
}

const TEXTO_ACCION = {
  atencion: 'Revisar ahora',
  guia: 'Ver la guía de crecimiento',
} as const

function HeroGranja({
  nombre, fecha, granjas, granjaId, estado, kpis, cargando,
  onGranjaChange, onRecargar, onAccion, onNavegar,
}: Props) {
  const granja = granjas.find((item) => item.id === granjaId)

  return (
    <section className={`hero-granja hero-granja--${estado.tono}`} aria-labelledby="hero-granja-titulo">
      <div className="hero-granja-tope">
        <span className="hero-granja-eyebrow">
          <span className="hero-granja-punto" aria-hidden="true" />
          {granja ? granja.nombre : 'Tu granja'} · <time>{fecha}</time>
        </span>
        <div className="hero-granja-controles">
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
            <IcRefresh size={15} aria-hidden="true" />
            <span>{cargando ? 'Actualizando…' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      <div className="hero-granja-cuerpo">
        <p className="hero-granja-saludo">Hola, {nombre}</p>
        <h1 id="hero-granja-titulo" className="hero-granja-titulo">{estado.titulo}</h1>
        <p className="hero-granja-detalle">{estado.detalle}</p>
        {estado.accion && (
          <button type="button" className="hero-granja-accion" onClick={onAccion}>
            {TEXTO_ACCION[estado.accion.tipo]}
            <IcArrowRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <ul className="hero-granja-cifras" aria-label="Indicadores de la granja" aria-busy={cargando}>
        {kpis.map((kpi) => (
          <li key={kpi.id}>
            <button type="button" className="hero-granja-cifra" title={kpi.detalle} onClick={() => onNavegar(kpi.destino)}>
              <strong>{kpi.valor}</strong>
              <span>{kpi.etiqueta}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default HeroGranja
