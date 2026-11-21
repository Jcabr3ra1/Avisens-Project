import TablaGestion, { type ColumnaGestion } from '@shared/ui/TablaGestion/TablaGestion'
import EstadoBadge from '@shared/ui/TablaGestion/EstadoBadge'
import '@shared/ui/TablaGestion/TablaGestion.css'
import type { PermisosGestion } from '@shared/auth/permisos'
import type { Lote } from '../api/lotes'

interface Props {
  lotes: Lote[]
  cargando: boolean
  permisos: PermisosGestion
  puedeCerrar?: boolean
  onVerPlan: (lote: Lote) => void
  onCerrarLote?: (lote: Lote) => void
  onEditar: (lote: Lote) => void
  onAlternar: (lote: Lote) => void
  onEliminar: (lote: Lote) => void
}

function TablaLotes({
  lotes,
  cargando,
  permisos,
  puedeCerrar = false,
  onVerPlan,
  onCerrarLote,
  onEditar,
  onAlternar,
  onEliminar,
}: Props) {
  const columnas: ColumnaGestion<Lote>[] = [
    {
      encabezado: 'Lote',
      render: (lote) => (
        <>
          <strong>
            <code>{lote.codigo}</code>
          </strong>
          <span className="tg-sub">{lote.proveedor?.nombre ?? 'Sin proveedor'}</span>
        </>
      ),
    },
    { encabezado: 'Galpón', render: (lote) => lote.galpon.nombre },
    {
      encabezado: 'Ingreso',
      render: (lote) => <span className="tg-num">{lote.fecha_ingreso.slice(0, 10)}</span>,
    },
    {
      encabezado: 'Aves',
      render: (lote) => (
        <>
          <span className="tg-num">{lote.cantidad_inicial.toLocaleString()}</span>
          {lote.estado === 'finalizado' && lote.cantidad_aves_vendidas !== null && lote.cantidad_aves_vendidas !== undefined && (
            <span className="tg-sub" title="Aves vendidas al cierre">
              {lote.cantidad_aves_vendidas.toLocaleString()} vendidas
            </span>
          )}
        </>
      ),
    },
    {
      encabezado: 'Estado',
      render: (lote) => (
        <>
          <EstadoBadge estado={lote.estado} />
          {lote.estado === 'finalizado' && lote.peso_promedio_final_g && (
            <span className="tg-sub" title="Liquidación del lote">
              {lote.peso_promedio_final_g.toLocaleString()} g
              {lote.fcr_final ? ` · FCR ${lote.fcr_final.toFixed(2)}` : ''}
            </span>
          )}
        </>
      ),
    },
  ]

  return (
    <TablaGestion
      items={lotes}
      columnas={columnas}
      claveFila={(lote) => lote.id}
      cargando={cargando}
      mensajeVacio="No hay lotes para mostrar."
      pistaVacio="Registra un lote para empezar el seguimiento productivo del galpón."
      filaClase={(lote) => (lote.estado === 'activo' ? undefined : 'tg-fila-inactiva')}
      renderAcciones={(lote) => (
        <>
          <button type="button" className="tg-btn" onClick={() => onVerPlan(lote)}>
            Ver plan
          </button>
          {onCerrarLote && puedeCerrar && lote.estado === 'activo' && (
            <button
              type="button"
              className="tg-btn"
              style={{
                borderColor: 'var(--color-aviso, #d97706)',
                color: 'var(--color-aviso, #d97706)',
                fontWeight: 600,
              }}
              onClick={() => onCerrarLote(lote)}
            >
              Cerrar lote
            </button>
          )}
          {permisos.editar && (
            <button type="button" className="tg-btn" onClick={() => onEditar(lote)}>
              Editar
            </button>
          )}
          {permisos.alternarActivo && (
            <button type="button" className="tg-btn" onClick={() => onAlternar(lote)}>
              {lote.estado === 'activo' ? 'Desactivar' : 'Activar'}
            </button>
          )}
          {permisos.eliminar && (
            <button
              type="button"
              className="tg-btn tg-btn--peligro"
              onClick={() => onEliminar(lote)}
            >
              Eliminar
            </button>
          )}
        </>
      )}
    />
  )
}

export default TablaLotes
