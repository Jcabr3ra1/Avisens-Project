import TablaGestion, { type ColumnaGestion } from '@shared/ui/TablaGestion/TablaGestion'
import EstadoBadge from '@shared/ui/TablaGestion/EstadoBadge'
import '@shared/ui/TablaGestion/TablaGestion.css'
import { gestionaAlgo, type PermisosGestion } from '@shared/auth/permisos'
import type { Galpon } from '../api/galpones'

interface Props {
  galpones: Galpon[]
  cargando: boolean
  permisos: PermisosGestion
  onEditar: (galpon: Galpon) => void
  onAlternar: (galpon: Galpon) => void
  onEliminar: (galpon: Galpon) => void
  onVerLotes: (galpon: Galpon) => void
  onVerSensores: (galpon: Galpon) => void
  onVerDispositivos: (galpon: Galpon) => void
  onVerEquipos: (galpon: Galpon) => void
}

function areaDe(galpon: Galpon): number | null {
  if (galpon.ancho_metros === null || galpon.largo_metros === null) return null
  return galpon.ancho_metros * galpon.largo_metros
}

function TablaGalpones({
  galpones,
  cargando,
  permisos,
  onEditar,
  onAlternar,
  onEliminar,
  onVerLotes,
  onVerSensores,
  onVerDispositivos,
  onVerEquipos,
}: Props) {
  const columnas: ColumnaGestion<Galpon>[] = [
    {
      encabezado: 'Galpón',
      render: (galpon) => (
        <>
          <strong>{galpon.nombre}</strong>
          <span className="tg-sub">
            <code>{galpon.codigo}</code>
          </span>
        </>
      ),
    },
    { encabezado: 'Granja', render: (galpon) => galpon.granja.nombre },
    {
      encabezado: 'Área',
      render: (galpon) => {
        const area = areaDe(galpon)
        return <span className="tg-num">{area !== null ? `${area.toLocaleString()} m²` : '—'}</span>
      },
    },
    {
      encabezado: 'Capacidad',
      render: (galpon) => (
        <span className="tg-num">{galpon.capacidad_aves?.toLocaleString() ?? '—'}</span>
      ),
    },
    {
      encabezado: 'Estado',
      render: (galpon) => <EstadoBadge estado={galpon.activo ? 'activo' : 'inactivo'} />,
    },
  ]

  return (
    <TablaGestion
      items={galpones}
      columnas={columnas}
      claveFila={(galpon) => galpon.id}
      cargando={cargando}
      mensajeVacio="No hay galpones para mostrar."
      pistaVacio="Registra el primer galpón de esta granja para empezar a alojar lotes."
      filaClase={(galpon) => (galpon.activo ? undefined : 'tg-fila-inactiva')}
      renderAcciones={(galpon) => (
        <>
          <button type="button" className="tg-chip" onClick={() => onVerLotes(galpon)}>
            Lotes
          </button>
          <button type="button" className="tg-chip" onClick={() => onVerSensores(galpon)}>
            Sensores
          </button>
          <button type="button" className="tg-chip" onClick={() => onVerDispositivos(galpon)}>
            Dispositivos
          </button>
          <button type="button" className="tg-chip" onClick={() => onVerEquipos(galpon)}>
            Equipos
          </button>
          {gestionaAlgo(permisos) && (
            <span className="tg-acciones-sep" aria-hidden="true" />
          )}
          {permisos.editar && (
            <button type="button" className="tg-btn" onClick={() => onEditar(galpon)}>
              Editar
            </button>
          )}
          {permisos.alternarActivo && (
            <button type="button" className="tg-btn" onClick={() => onAlternar(galpon)}>
              {galpon.activo ? 'Desactivar' : 'Activar'}
            </button>
          )}
          {permisos.eliminar && (
            <button
              type="button"
              className="tg-btn tg-btn--peligro"
              onClick={() => onEliminar(galpon)}
            >
              Eliminar
            </button>
          )}
        </>
      )}
    />
  )
}

export default TablaGalpones
