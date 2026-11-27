import { useState } from 'react'
import { formatearFechaCalendario } from '@shared/utils/fechas'
import FormularioPesoObjetivo from '../../lotes/components/FormularioPesoObjetivo'
import { DESCRIPCION_DESACTUALIZADO_PLAN, etiquetaEstadoPlan } from '../../lotes/model/planLoteVista'
import type { PlanLoteGuia } from '../api/guiaCrecimiento'
import { formatearPeso } from '../model/proyeccion'

type Props = {
  loteId: number
  plan: PlanLoteGuia | null
  puedeRegistrar: boolean
  cargando: boolean
  error: string
  ocupado: boolean
  minLibras: number
  onGuardar: (pesoObjetivoG: number) => Promise<void>
  onRecalcular: () => void
  onReintentar: () => void
}

function MetaDelLote({
  loteId, plan, puedeRegistrar, cargando, error, ocupado, minLibras, onGuardar, onRecalcular, onReintentar,
}: Props) {
  const [editando, setEditando] = useState(false)
  const mostrarFormulario = puedeRegistrar && (editando || (plan === null && !cargando && !error))

  async function guardar(pesoG: number) {
    await onGuardar(pesoG)
    setEditando(false)
  }

  return (
    <section className="gdc-meta" aria-labelledby="gdc-meta-titulo">
      <h3 id="gdc-meta-titulo">Meta de venta</h3>

      {error && (
        <div className="guia-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onReintentar} disabled={ocupado}>Reintentar carga</button>
        </div>
      )}

      {cargando ? (
        <p className="guia-cargando" role="status">Cargando objetivo del lote…</p>
      ) : plan === null ? (
        <p className="gdc-meta-vacio">
          {puedeRegistrar
            ? '¿A qué peso quieres llevar tus pollos? Con eso calculamos el día de salida.'
            : 'Este lote todavía no tiene un objetivo de peso definido.'}
        </p>
      ) : (
        <>
          <p className="gdc-meta-valor">
            <strong>{formatearPeso(plan.peso_objetivo_g)}</strong>
            <span>
              Día {plan.resultado.dia_objetivo ?? '—'} · salida el {formatearFechaCalendario(plan.resultado.fecha_salida_calculada)}
            </span>
          </p>
          <p className={`gdc-meta-estado${plan.desactualizado ? ' gdc-meta-estado--aviso' : ''}`}>
            {plan.desactualizado ? 'Meta desactualizada' : etiquetaEstadoPlan(plan.estado_dia)}
          </p>
          {plan.desactualizado && (
            <p className="gdc-meta-nota">{DESCRIPCION_DESACTUALIZADO_PLAN} Los resultados corresponden a la meta guardada; se necesita recalcularla.</p>
          )}
        </>
      )}

      {puedeRegistrar && plan !== null && !editando && (
        <div className="gdc-meta-acciones">
          <button type="button" className="adm-btn adm-btn--secundario" onClick={() => setEditando(true)} disabled={ocupado}>
            Cambiar peso objetivo
          </button>
          <button type="button" className="adm-btn adm-btn--secundario" onClick={onRecalcular} disabled={ocupado || cargando}>
            Recalcular meta
          </button>
        </div>
      )}

      {mostrarFormulario && (
        <div className="gdc-meta-formulario">
          <FormularioPesoObjetivo
            key={`${loteId}-${plan?.id ?? 'nuevo'}`}
            pesoActualG={plan?.peso_objetivo_g ?? null}
            minLibras={minLibras}
            deshabilitado={ocupado || cargando}
            onEnviar={guardar}
          />
          {editando && (
            <button type="button" className="gdc-meta-cancelar" onClick={() => setEditando(false)}>Cancelar</button>
          )}
        </div>
      )}
    </section>
  )
}

export default MetaDelLote
