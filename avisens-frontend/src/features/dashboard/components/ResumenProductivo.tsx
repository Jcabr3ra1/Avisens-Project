import type { DashboardIndicador } from '../model/dashboard'

interface ResumenProductivoProps {
  indicador: DashboardIndicador | null
  cargando: boolean
  tieneLote: boolean
  onAbrirBitacora: () => void
}

function formatearNumero(valor: number | null, decimales = 1): string {
  if (valor === null) return 'Sin datos'
  return valor.toLocaleString('es-CO', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })
}

function ResumenProductivo({ indicador, cargando, tieneLote, onAbrirBitacora }: ResumenProductivoProps) {
  const metricas = [
    { etiqueta: 'Peso promedio', valor: indicador?.pesoPromedioG ?? null, sufijo: ' g', decimales: 0 },
    { etiqueta: 'Mortalidad acumulada', valor: indicador?.mortalidadAcumuladaPct ?? null, sufijo: ' %', decimales: 1 },
    { etiqueta: 'Conversión alimenticia', valor: indicador?.fcr ?? null, sufijo: '', decimales: 2 },
    { etiqueta: 'Eficiencia del lote', valor: indicador?.epef ?? null, sufijo: '', decimales: 0 },
  ]

  return (
    <section className="dashboard-panel dashboard-production" aria-labelledby="resumen-productivo-title">
      <div className="dashboard-panel__heading dashboard-panel__heading--inline">
        <div>
          <p className="dashboard-section-label">Seguimiento</p>
          <h2 id="resumen-productivo-title">Resumen productivo</h2>
        </div>
        {tieneLote && (
          <button className="dashboard-text-button" type="button" onClick={onAbrirBitacora}>
            Ver bitácora
          </button>
        )}
      </div>

      {cargando ? (
        <p className="dashboard-panel__message" role="status">Cargando indicadores…</p>
      ) : !tieneLote ? (
        <p className="dashboard-panel__message">El resumen estará disponible cuando exista un lote activo.</p>
      ) : !indicador ? (
        <div className="dashboard-empty-inline dashboard-empty-inline--neutral">
          <div>
            <strong>Aún no hay indicadores calculados</strong>
            <p>Registra peso, mortalidad y consumo en la bitácora para construir este resumen.</p>
          </div>
        </div>
      ) : (
        <div className="dashboard-production__grid">
          {metricas.map((metrica) => (
            <div key={metrica.etiqueta} className="dashboard-production__metric">
              <span>{metrica.etiqueta}</span>
              <strong>
                {formatearNumero(metrica.valor, metrica.decimales)}
                {metrica.valor !== null && metrica.sufijo}
              </strong>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default ResumenProductivo
