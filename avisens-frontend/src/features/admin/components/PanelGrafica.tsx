import type { CSSProperties, ReactNode } from 'react'

type Props = {
  id: string
  titulo: string
  subtitulo: string
  indice: number
  cargando: boolean
  error: boolean
  vacio: boolean
  mensajeVacio: string
  onReintentar: () => void
  leyenda?: { etiqueta: string; color: string }[]
  resumen?: ReactNode
  alturaClase?: string
  children: ReactNode
}

function PanelGrafica({
  id, titulo, subtitulo, indice, cargando, error, vacio, mensajeVacio, onReintentar,
  leyenda, resumen, alturaClase = '', children,
}: Props) {
  return (
    <section className="cdc-panel cdc-entra cdc-grafica-panel" style={{ '--i': indice } as CSSProperties} aria-labelledby={`${id}-titulo`}>
      <header className="cdc-panel-cabecera">
        <div>
          <h2 id={`${id}-titulo`}>{titulo}</h2>
          <p>{subtitulo}</p>
        </div>
        {leyenda && !error && !cargando && !vacio && (
          <ul className="cdc-leyenda-grafica">
            {leyenda.map((item) => (
              <li key={item.etiqueta}><i style={{ background: item.color }} aria-hidden="true" />{item.etiqueta}</li>
            ))}
          </ul>
        )}
      </header>
      {resumen && !error && !cargando && !vacio && <div className="cdc-grafica-resumen">{resumen}</div>}

      <div className={`cdc-grafica-lienzo ${alturaClase}`}>
        {cargando ? (
          <div className="cdc-grafica-esqueleto" role="status" aria-label="Cargando gráfica">
            <span className="cdc-esqueleto" />
          </div>
        ) : error ? (
          <div className="cdc-error" role="alert">
            <span>No se pudieron cargar las métricas de la plataforma.</span>
            <button type="button" onClick={onReintentar}>Reintentar</button>
          </div>
        ) : vacio ? (
          <div className="cdc-vacio">
            <strong>Sin datos en este periodo</strong>
            <p>{mensajeVacio}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  )
}

export default PanelGrafica
