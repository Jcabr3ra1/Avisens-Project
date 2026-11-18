import { IcCoin, IcEgg, IcLeaf, IcScale } from '@shared/ui/icons/icons'


export interface ResumenFinancieroLoteProps {
  codigoLote: string
  cantidadAves: number
  diaVida: number
  estado: 'activo' | 'finalizado' | 'inactivo'
  ingresos: number
  egresos: number
  pesoActualKg: number | null
  pesoObjetivoKg: number | null
  /** Balance sobre ingresos; null cuando aún no hay ingresos. */
  margenNetoPct?: number | null
  proyeccion?: {
    diaEstimado: number
    costoEstimado: number
    ingresoEsperado: number
  }
}

const ETIQUETA_ESTADO: Record<ResumenFinancieroLoteProps['estado'], string> = {
  activo: 'Activo',
  finalizado: 'Finalizado',
  inactivo: 'Inactivo',
}

function cop(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor)
}

function ResumenFinancieroLote({
  codigoLote,
  cantidadAves,
  diaVida,
  estado,
  ingresos,
  egresos,
  pesoActualKg,
  pesoObjetivoKg,
  margenNetoPct,
  proyeccion,
}: ResumenFinancieroLoteProps) {
  const balance = ingresos - egresos
  const costoPorAve = cantidadAves > 0 ? egresos / cantidadAves : 0
  const utilidad = proyeccion ? proyeccion.ingresoEsperado - proyeccion.costoEstimado : 0
  const margen = proyeccion && proyeccion.ingresoEsperado > 0
    ? (utilidad / proyeccion.ingresoEsperado) * 100
    : 0

  return (
    <article className="rfl-card adm-panel">
      {/* Cabecera */}
      <header className="rfl-head">
        <div className="rfl-head-info">
          <h3 className="rfl-codigo">{codigoLote}</h3>
          <p className="rfl-meta">
            {cantidadAves.toLocaleString('es-CO')} aves · Día {diaVida}
          </p>
        </div>
        <span className={`rfl-badge rfl-badge--${estado}`}>
          {ETIQUETA_ESTADO[estado]}
        </span>
      </header>

      {/* Bloque 1: Ingresos, Egresos, Balance */}
      <section className="rfl-bloque" aria-label="Resumen económico">
        <div className="rfl-item">
          <span className="rfl-label">Ingresos</span>
          <strong className="rfl-valor rfl-valor--ok">{cop(ingresos)}</strong>
        </div>
        <div className="rfl-item">
          <span className="rfl-label">Egresos</span>
          <strong className="rfl-valor rfl-valor--peligro">{cop(egresos)}</strong>
        </div>
        <div className="rfl-item">
          <span className="rfl-label">Balance</span>
          <strong className={`rfl-valor ${balance < 0 ? 'rfl-valor--peligro' : 'rfl-valor--ok'}`}>
            {cop(balance)}
          </strong>
          {margenNetoPct !== undefined && (
            <span className="rfl-nota">
              Margen neto {margenNetoPct === null
                ? '—'
                : `${margenNetoPct.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`}
            </span>
          )}
        </div>
      </section>

      {/* Bloque 2: Costo/ave, peso actual, peso objetivo */}
      <section className="rfl-bloque" aria-label="Indicadores productivos">
        <div className="rfl-item rfl-item--icono">
          <span className="rfl-icono" aria-hidden="true"><IcCoin size={16} /></span>
          <div>
            <span className="rfl-label">Costo por ave</span>
            <strong className="rfl-valor">{cop(costoPorAve)}</strong>
          </div>
        </div>
        <div className="rfl-item rfl-item--icono">
          <span className="rfl-icono" aria-hidden="true"><IcScale size={16} /></span>
          <div>
            <span className="rfl-label">Peso actual</span>
            <strong className="rfl-valor">
              {pesoActualKg !== null ? `${pesoActualKg.toFixed(2)} kg` : '—'}
            </strong>
          </div>
        </div>
        <div className="rfl-item rfl-item--icono">
          <span className="rfl-icono" aria-hidden="true"><IcEgg size={16} /></span>
          <div>
            <span className="rfl-label">Peso objetivo</span>
            <strong className="rfl-valor">
              {pesoObjetivoKg !== null ? `${pesoObjetivoKg.toFixed(2)} kg` : '—'}
            </strong>
          </div>
        </div>
      </section>

      {/* Bloque 3: Proyección */}
      {proyeccion && (
        <section className="rfl-proyeccion" aria-label="Proyección al cierre">
          <header className="rfl-proyeccion-head">
            <IcLeaf size={14} aria-hidden="true" />
            <span>Proyección al día {proyeccion.diaEstimado}</span>
          </header>
          <div className="rfl-proyeccion-grid">
            <div>
              <span className="rfl-label">Costo estimado</span>
              <strong className="rfl-valor">{cop(proyeccion.costoEstimado)}</strong>
            </div>
            <div>
              <span className="rfl-label">Ingreso esperado</span>
              <strong className="rfl-valor">{cop(proyeccion.ingresoEsperado)}</strong>
            </div>
            <div>
              <span className="rfl-label">Utilidad</span>
              <strong className={`rfl-valor ${utilidad < 0 ? 'rfl-valor--peligro' : 'rfl-valor--ok'}`}>
                {cop(utilidad)}
              </strong>
            </div>
            <div>
              <span className="rfl-label">Margen</span>
              <strong className={`rfl-valor ${margen < 0 ? 'rfl-valor--peligro' : 'rfl-valor--ok'}`}>
                {margen.toFixed(1)}%
              </strong>
            </div>
          </div>
        </section>
      )}
    </article>
  )
}

export default ResumenFinancieroLote