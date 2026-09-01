import type { ReactNode } from 'react'

export type TonoStat = 'neutral' | 'ok' | 'aviso' | 'peligro' | 'info'

export type Stat = {
  label: string
  valor: string | number
  icono: ReactNode
  tono?: TonoStat
}

function TarjetasResumen({ stats, etiqueta }: { stats: Stat[]; etiqueta: string }) {
  return (
    <section className="adm-resumen" aria-label={etiqueta}>
      {stats.map((stat) => (
        <article key={stat.label} className={`adm-stat adm-stat--${stat.tono ?? 'neutral'}`}>
          <span className="adm-stat-icono" aria-hidden="true">
            {stat.icono}
          </span>
          <div className="adm-stat-texto">
            <span className="adm-stat-valor">
              {typeof stat.valor === 'number' ? stat.valor.toLocaleString() : stat.valor}
            </span>
            <span className="adm-stat-label">{stat.label}</span>
          </div>
        </article>
      ))}
    </section>
  )
}

export default TarjetasResumen
