import { useMemo, useState, type FormEvent } from 'react'
import { getUsuario } from '@shared/api/tokens'
import { mensajeDeError } from '@shared/utils/errores'
import FormularioOrden from './components/FormularioOrden'
import PanelOrden from './components/PanelOrden'
import ResumenOrdenes from './components/ResumenOrdenes'
import TablaOrdenes from './components/TablaOrdenes'
import { useOrdenesCompra } from './hooks/useOrdenesCompra'
import { FORMULARIO_ORDEN_INICIAL, type FormularioOrden as DatosFormularioOrden, type OrdenCompra } from './model/ordenCompra'
import './OrdenesCompraPage.css'

function codigoAutomatico() {
  const fecha = new Date()
  const dia = [fecha.getFullYear(), String(fecha.getMonth() + 1).padStart(2, '0'), String(fecha.getDate()).padStart(2, '0')].join('')
  return `OC-${dia}-${String(Date.now()).slice(-6)}`
}

function OrdenesCompraPage() {
  const gestion = useOrdenesCompra()
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const [form, setForm] = useState<DatosFormularioOrden>(FORMULARIO_ORDEN_INICIAL)
  const [guardando, setGuardando] = useState(false)
  const [errorFormulario, setErrorFormulario] = useState('')
  const [ordenSeleccionadaId, setOrdenSeleccionadaId] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<'todos' | OrdenCompra['estado']>('todos')
  const usuario = getUsuario()
  const ordenSeleccionada = gestion.ordenes.find((orden) => orden.id === ordenSeleccionadaId) ?? null

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es-CO')
    return gestion.ordenes.filter((orden) => (estado === 'todos' || orden.estado === estado) && (!termino || [orden.codigo, orden.proveedor.nombre, orden.granja.nombre].some((valor) => valor.toLocaleLowerCase('es-CO').includes(termino))))
  }, [busqueda, estado, gestion.ordenes])

  const abrirCrear = () => { setForm(FORMULARIO_ORDEN_INICIAL); setErrorFormulario(''); setFormularioAbierto(true) }
  const cambiar = <K extends keyof DatosFormularioOrden>(campo: K, valor: DatosFormularioOrden[K]) => setForm((actual) => ({ ...actual, [campo]: valor }))
  const crear = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!usuario) { setErrorFormulario('No encontramos tu sesión. Ingresa nuevamente.'); return }
    setGuardando(true); setErrorFormulario('')
    void gestion.crear({ proveedor_id: Number(form.proveedor_id), granja_id: Number(form.granja_id), lote_id: form.lote_id ? Number(form.lote_id) : undefined, usuario_id: usuario.id, codigo: codigoAutomatico(), fecha_pedido: form.fecha_pedido || undefined, fecha_entrega_estimada: form.fecha_entrega_estimada || undefined }).then((orden) => { setFormularioAbierto(false); setOrdenSeleccionadaId(orden.id) }).catch((err) => setErrorFormulario(mensajeDeError(err, 'No se pudo crear la orden.'))).finally(() => setGuardando(false))
  }
  const cancelar = (orden: OrdenCompra) => {
    if (!window.confirm(`¿Cancelar la orden ${orden.codigo}?`)) return
    void gestion.cancelar(orden.id).catch(() => undefined)
  }

  return <div className="page-container oc-page">
    <header className="oc-cabecera"><ResumenOrdenes ordenes={gestion.ordenes} /><button type="button" className="oc-boton-nuevo" onClick={abrirCrear}>+ Nueva orden</button></header>
    {gestion.error && <div className="oc-alerta" role="alert"><span>{gestion.error}</span><button type="button" onClick={() => void gestion.recargar()}>Reintentar</button></div>}
    <section className="oc-listado" aria-label="Listado de órdenes de compra">
      <div className="oc-barra"><label className="oc-busqueda"><span className="oc-sr-only">Buscar orden</span><input value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar por orden, proveedor o granja" /></label><select aria-label="Filtrar por estado" value={estado} onChange={(evento) => setEstado(evento.target.value as typeof estado)}><option value="todos">Todos los estados</option><option value="pendiente">Pendientes</option><option value="en_proceso">En recepción</option><option value="entregada">Entregadas</option><option value="cancelada">Canceladas</option></select><span>{visibles.length} de {gestion.ordenes.length}</span></div>
      {gestion.cargando ? <p className="oc-vacio" role="status">Cargando órdenes…</p> : gestion.ordenes.length === 0 ? <div className="oc-vacio"><h2>Aún no hay órdenes</h2><p>Crea una orden para registrar los insumos que esperas recibir en tu granja.</p></div> : visibles.length === 0 ? <div className="oc-vacio"><h2>No hay coincidencias</h2><p>Prueba con otro texto o estado.</p></div> : <TablaOrdenes ordenes={visibles} onAbrir={(orden) => setOrdenSeleccionadaId(orden.id)} onCancelar={cancelar} />}
    </section>
    {formularioAbierto && <FormularioOrden form={form} granjas={gestion.granjas} proveedores={gestion.proveedores} lotes={gestion.lotes} guardando={guardando} error={errorFormulario} onCambiar={cambiar} onGuardar={crear} onCerrar={() => !guardando && setFormularioAbierto(false)} />}
    {ordenSeleccionada && <PanelOrden orden={ordenSeleccionada} insumos={gestion.insumos} onCerrar={() => setOrdenSeleccionadaId(null)} onAgregarDetalle={(payload) => gestion.agregarDetalle(ordenSeleccionada.id, payload)} onEliminarDetalle={(detalleId) => gestion.eliminarDetalle(ordenSeleccionada.id, detalleId)} onRecibir={(items) => gestion.recibir(ordenSeleccionada.id, { clave_idempotencia: `recepcion-${ordenSeleccionada.id}-${Date.now()}`, items })} />}
  </div>
}

export default OrdenesCompraPage
