import { useEffect, useMemo, useRef, type FormEvent } from 'react'
import type { Granja } from '@features/granjas/api/granjas'
import type { Lote } from '@features/lotes/api/lotes'
import type { Proveedor } from '@features/proveedores/api/proveedores'
import type { FormularioOrden as DatosOrden } from '../model/ordenCompra'

type Props = {
  form: DatosOrden
  granjas: Granja[]
  proveedores: Proveedor[]
  lotes: Lote[]
  guardando: boolean
  error: string
  onCambiar: <K extends keyof DatosOrden>(campo: K, valor: DatosOrden[K]) => void
  onGuardar: (evento: FormEvent<HTMLFormElement>) => void
  onCerrar: () => void
}

function FormularioOrden({ form, granjas, proveedores, lotes, guardando, error, onCambiar, onGuardar, onCerrar }: Props) {
  const granjaRef = useRef<HTMLSelectElement>(null)
  const lotesDeGranja = useMemo(() => lotes.filter((lote) => String(lote.galpon.granja.id) === form.granja_id), [form.granja_id, lotes])

  useEffect(() => {
    granjaRef.current?.focus()
    const cerrarConEscape = (evento: KeyboardEvent) => { if (evento.key === 'Escape' && !guardando) onCerrar() }
    window.addEventListener('keydown', cerrarConEscape)
    return () => window.removeEventListener('keydown', cerrarConEscape)
  }, [guardando, onCerrar])

  return (
    <div className="oc-modal-fondo" onMouseDown={onCerrar}>
      <section className="oc-modal" role="dialog" aria-modal="true" aria-labelledby="oc-modal-titulo" onMouseDown={(evento) => evento.stopPropagation()}>
        <header><h2 id="oc-modal-titulo">Nueva orden de compra</h2><p>El código se genera automáticamente. Luego podrás agregar los insumos.</p></header>
        <form onSubmit={onGuardar}>
          <div className="oc-campos-dos">
            <label className="oc-campo"><span>Granja *</span><select ref={granjaRef} value={form.granja_id} onChange={(evento) => { onCambiar('granja_id', evento.target.value); onCambiar('lote_id', '') }} required><option value="">Selecciona una granja</option>{granjas.map((granja) => <option key={granja.id} value={granja.id}>{granja.nombre}</option>)}</select></label>
            <label className="oc-campo"><span>Proveedor *</span><select value={form.proveedor_id} onChange={(evento) => onCambiar('proveedor_id', evento.target.value)} required><option value="">Selecciona un proveedor</option>{proveedores.map((proveedor) => <option key={proveedor.id} value={proveedor.id}>{proveedor.nombre}</option>)}</select></label>
          </div>
          <label className="oc-campo"><span>Lote relacionado</span><select value={form.lote_id} onChange={(evento) => onCambiar('lote_id', evento.target.value)} disabled={!form.granja_id}><option value="">Compra general de la granja</option>{lotesDeGranja.map((lote) => <option key={lote.id} value={lote.id}>{lote.codigo}</option>)}</select></label>
          <div className="oc-campos-dos">
            <label className="oc-campo"><span>Fecha del pedido</span><input type="date" value={form.fecha_pedido} onChange={(evento) => onCambiar('fecha_pedido', evento.target.value)} /></label>
            <label className="oc-campo"><span>Entrega estimada</span><input type="date" value={form.fecha_entrega_estimada} onChange={(evento) => onCambiar('fecha_entrega_estimada', evento.target.value)} min={form.fecha_pedido} /></label>
          </div>
          {error && <p className="oc-error-formulario" role="alert">{error}</p>}
          <footer className="oc-modal-acciones"><button type="button" onClick={onCerrar} disabled={guardando}>Cancelar</button><button type="submit" className="oc-boton-principal" disabled={guardando}>{guardando ? 'Creando…' : 'Crear orden'}</button></footer>
        </form>
      </section>
    </div>
  )
}

export default FormularioOrden
