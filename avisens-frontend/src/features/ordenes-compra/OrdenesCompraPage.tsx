import { useMemo, useState, type FormEvent } from 'react'
import { getUsuario } from '@shared/api/tokens'
import BarraHerramientas, { type OpcionFiltro } from '@shared/ui/admin/BarraHerramientas'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import { IcPlus } from '@shared/ui/icons/icons'
import { mensajeDeError } from '@shared/utils/errores'
import FormularioOrden from './components/FormularioOrden'
import PanelOrden from './components/PanelOrden'
import ResumenOrdenes from './components/ResumenOrdenes'
import TablaOrdenes from './components/TablaOrdenes'
import { useOrdenesCompra } from './hooks/useOrdenesCompra'
import { FORMULARIO_ORDEN_INICIAL, type FormularioOrden as DatosFormularioOrden, type OrdenCompra } from './model/ordenCompra'
import '@shared/ui/admin/AdminKit.css'
import './OrdenesCompraPage.css'

type FiltroEstado = 'todos' | OrdenCompra['estado']

const OPCIONES_ESTADO: OpcionFiltro<FiltroEstado>[] = [
  { valor: 'todos', label: 'Todas' },
  { valor: 'pendiente', label: 'Pendientes' },
  { valor: 'en_proceso', label: 'En recepción' },
  { valor: 'entregada', label: 'Entregadas' },
  { valor: 'cancelada', label: 'Canceladas' },
]

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
  const [estado, setEstado] = useState<FiltroEstado>('todos')
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
    if (!window.confirm(
      `¿Cancelar la orden ${orden.codigo}? Ya no podrá recibir insumos ni cambiar de estado.`,
    )) return
    void gestion.cancelar(orden.id).catch(() => undefined)
  }

  return (
    <div className="page-container oc-page adm-page">
      <CabeceraAdmin
        eyebrow="Abastecimiento"
        titulo="Órdenes de compra"
        subtitulo="Controla lo solicitado y registra cada recepción directamente en bodega."
        acciones={(
          <button type="button" className="adm-btn adm-btn--primario" onClick={abrirCrear}>
            <IcPlus size={17} aria-hidden="true" />
            Nueva orden
          </button>
        )}
      />

      <ResumenOrdenes ordenes={gestion.ordenes} />

      {gestion.error && (
        <div className="adm-alerta" role="alert">
          <span>{gestion.error}</span>
          <button type="button" onClick={() => void gestion.recargar()}>Reintentar</button>
        </div>
      )}

      <section className="oc-listado adm-panel" aria-label="Listado de órdenes de compra">
        {!gestion.cargando && gestion.ordenes.length > 0 && (
          <BarraHerramientas
            busqueda={busqueda}
            placeholder="Buscar por orden, proveedor o granja"
            etiquetaBusqueda="Buscar orden de compra"
            onBuscar={setBusqueda}
            filtro={estado}
            opciones={OPCIONES_ESTADO}
            etiquetaFiltro="Filtrar órdenes por estado"
            onCambiarFiltro={setEstado}
            visibles={visibles.length}
            total={gestion.ordenes.length}
          />
        )}

        {gestion.cargando ? (
          <p className="oc-vacio" role="status">Cargando órdenes…</p>
        ) : gestion.ordenes.length === 0 ? (
          <div className="oc-vacio">
            <h2>Aún no hay órdenes</h2>
            <p>Crea una orden para registrar los insumos que esperas recibir en tu granja.</p>
          </div>
        ) : visibles.length === 0 ? (
          <div className="oc-vacio">
            <h2>No hay coincidencias</h2>
            <p>Prueba con otro texto o estado.</p>
          </div>
        ) : (
          <TablaOrdenes
            ordenes={visibles}
            onAbrir={(orden) => setOrdenSeleccionadaId(orden.id)}
            onCancelar={cancelar}
          />
        )}
      </section>

      {formularioAbierto && (
        <FormularioOrden
          form={form}
          granjas={gestion.granjas}
          proveedores={gestion.proveedores}
          lotes={gestion.lotes}
          guardando={guardando}
          error={errorFormulario}
          onCambiar={cambiar}
          onGuardar={crear}
          onCerrar={() => !guardando && setFormularioAbierto(false)}
        />
      )}

      {ordenSeleccionada && (
        <PanelOrden
          orden={ordenSeleccionada}
          insumos={gestion.insumos}
          onCerrar={() => setOrdenSeleccionadaId(null)}
          onAgregarDetalle={(payload) => gestion.agregarDetalle(ordenSeleccionada.id, payload)}
          onEliminarDetalle={(detalleId) => gestion.eliminarDetalle(ordenSeleccionada.id, detalleId)}
          onRecibir={(items, claveIdempotencia) => gestion.recibir(ordenSeleccionada.id, {
            clave_idempotencia: claveIdempotencia,
            items,
          })}
        />
      )}
    </div>
  )
}

export default OrdenesCompraPage
