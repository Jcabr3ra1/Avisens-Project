import { useMemo, useRef, useState, type FormEvent } from 'react'
import type { Insumo } from '@features/inventario/api/insumos'
import { mensajeDeError } from '@shared/utils/errores'
import type { CrearDetalleOrdenPayload, OrdenCompra } from '../model/ordenCompra'
import { nuevaClaveIdempotencia } from '@shared/utils/idempotencia'

type Props = {
  orden: OrdenCompra
  insumos: Insumo[]
  onCerrar: () => void
  onAgregarDetalle: (payload: CrearDetalleOrdenPayload) => Promise<unknown>
  onEliminarDetalle: (detalleId: number) => Promise<unknown>
  onRecibir: (
    items: { detalle_id: number; cantidad: number }[],
    claveIdempotencia: string,
  ) => Promise<unknown>
}

function PanelOrden({ orden, insumos, onCerrar, onAgregarDetalle, onEliminarDetalle, onRecibir }: Props) {
  const [insumoId, setInsumoId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [precio, setPrecio] = useState('')
  const [recibos, setRecibos] = useState<Record<number, string>>({})
  // Identifica UN intento de recepción. El backend la usa para reconocer un
  // reintento y no volver a sumar el stock; antes se generaba con Date.now()
  // en cada llamada, así que cambiaba siempre y esa protección nunca actuaba.
  const claveIntento = useRef<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const editable = orden.estado === 'pendiente' || orden.estado === 'en_proceso'
  const insumosDisponibles = useMemo(() => insumos.filter((insumo) => insumo.granja_id === orden.granja_id && !orden.detalles.some((detalle) => detalle.insumo_id === insumo.id)), [insumos, orden])
  const pendientes = orden.detalles.filter((detalle) => detalle.cantidad_recibida < detalle.cantidad)

  const ejecutar = async (accion: () => Promise<unknown>) => {
    setProcesando(true)
    setError('')
    try { await accion() } catch (err) { setError(mensajeDeError(err, 'No se pudo completar la acción.')) } finally { setProcesando(false) }
  }

  const agregar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    void ejecutar(async () => {
      await onAgregarDetalle({ insumo_id: Number(insumoId), cantidad: Number(cantidad), precio_unitario_cop: Number(precio) })
      setInsumoId(''); setCantidad(''); setPrecio('')
    })
  }

  const recibir = () => {
    const items = pendientes.map((detalle) => ({ detalle_id: detalle.id, cantidad: Number(recibos[detalle.id] || 0) })).filter((item) => item.cantidad > 0)
    if (!items.length) { setError('Indica al menos una cantidad recibida.'); return }
    // Se conserva entre reintentos: si la red falla y el usuario vuelve a
    // pulsar sin tocar nada, viaja la misma clave y el backend no duplica.
    claveIntento.current ??= nuevaClaveIdempotencia('recepcion')
    void ejecutar(async () => {
      await onRecibir(items, claveIntento.current as string)
      // Recepción aceptada: la siguiente es otra, con su propia clave.
      claveIntento.current = null
      setRecibos({})
    })
  }

  return (
    <aside className="oc-panel" aria-label={`Detalle de la orden ${orden.codigo}`}>
      <header className="oc-panel-cabecera"><div><p>Orden {orden.codigo}</p><h2>{orden.proveedor.nombre}</h2><span>{orden.granja.nombre}{orden.lote ? ` · Lote ${orden.lote.codigo}` : ''}</span></div><button type="button" onClick={onCerrar} aria-label="Cerrar detalle">×</button></header>
      <div className="oc-panel-resumen"><span className={`oc-estado oc-estado--${orden.estado}`}>{orden.estado === 'en_proceso' ? 'En recepción' : orden.estado[0].toUpperCase() + orden.estado.slice(1)}</span><strong>{Number(orden.valor_total_cop ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}</strong></div>
      {error && <p className="oc-error-formulario" role="alert">{error}</p>}
      {editable && <form className="oc-detalle-form" onSubmit={agregar}><h3>Agregar insumo</h3><select value={insumoId} onChange={(evento) => { const id = evento.target.value; setInsumoId(id); const insumo = insumos.find((item) => item.id === Number(id)); setPrecio(insumo?.precio_unitario_cop?.toString() ?? '') }} required><option value="">Selecciona un insumo</option>{insumosDisponibles.map((insumo) => <option key={insumo.id} value={insumo.id}>{insumo.nombre} · {insumo.unidad_medida}</option>)}</select><div><input type="number" min="0.001" step="0.001" value={cantidad} onChange={(evento) => setCantidad(evento.target.value)} placeholder="Cantidad" required /><input type="number" min="1" step="0.01" value={precio} onChange={(evento) => setPrecio(evento.target.value)} placeholder="Precio unitario" required /></div><button type="submit" disabled={procesando || !insumosDisponibles.length}>Agregar a la orden</button></form>}
      <section className="oc-detalles"><h3>Insumos solicitados</h3>{orden.detalles.length === 0 ? <p className="oc-texto-suave">Aún no agregas insumos a esta orden.</p> : <div className="oc-detalles-lista">{orden.detalles.map((detalle) => <article key={detalle.id}><div><strong>{detalle.insumo.nombre}</strong><span>{detalle.cantidad_recibida} de {detalle.cantidad} {detalle.unidad_medida} recibidos</span></div><span>{Number(detalle.subtotal_cop).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}</span>{editable && detalle.cantidad_recibida === 0 && <button type="button" disabled={procesando} onClick={() => void ejecutar(() => onEliminarDetalle(detalle.id))}>Quitar</button>}</article>)}</div>}</section>
      {editable && pendientes.length > 0 && <section className="oc-recepcion"><h3>Registrar recepción</h3><p>Solo registra lo que llegó hoy; la bodega se actualizará automáticamente.</p>{pendientes.map((detalle) => { const faltante = detalle.cantidad - detalle.cantidad_recibida; return <label key={detalle.id}><span>{detalle.insumo.nombre}<small>Faltan {faltante} {detalle.unidad_medida}</small></span><input type="number" min="0" max={faltante} step="0.001" value={recibos[detalle.id] ?? ''} onChange={(evento) => { claveIntento.current = null; setRecibos((actual) => ({ ...actual, [detalle.id]: evento.target.value })) }} placeholder="0" /></label> })}<button type="button" className="oc-boton-principal" disabled={procesando} onClick={recibir}>{procesando ? 'Registrando…' : 'Registrar recepción'}</button></section>}
    </aside>
  )
}

export default PanelOrden
