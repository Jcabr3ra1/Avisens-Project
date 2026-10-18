import * as Tabs from '@radix-ui/react-tabs'
import { IcSearch } from '@shared/ui/icons/icons'
import type { FiltroRolUsuario } from '../hooks/useFiltroUsuarios'
import type { ResumenDeUsuarios } from '../hooks/useResumenUsuarios'

type Props = {
  busqueda: string
  visibles: number
  total: number
  esPropietario: boolean
  rolFiltro: FiltroRolUsuario
  resumen: ResumenDeUsuarios
  onBuscar: (texto: string) => void
  onCambiarRol: (rol: FiltroRolUsuario) => void
}

function BarraUsuarios({
  busqueda,
  visibles,
  total,
  esPropietario,
  rolFiltro,
  resumen,
  onBuscar,
  onCambiarRol,
}: Props) {
  return (
    <div className="usuarios-toolbar">
      <label className="usuarios-search">
        <IcSearch size={15} />
        <span className="usuarios-sr-only">Buscar usuarios</span>
        <input
          type="search"
          placeholder="Buscar por nombre, usuario, correo o cédula…"
          value={busqueda}
          onChange={(evento) => onBuscar(evento.target.value)}
        />
      </label>

      {!esPropietario ? (
        <Tabs.Root value={rolFiltro} onValueChange={(v) => onCambiarRol(v as FiltroRolUsuario)}>
          <Tabs.List className="usuarios-tabs-list" aria-label="Filtrar personas por rol">
            <Tabs.Trigger value="todos" className="usuarios-tab-trigger">
              Todos <span>{resumen.total}</span>
            </Tabs.Trigger>
            <Tabs.Trigger value="Administrador" className="usuarios-tab-trigger">
              Administradores <span>{resumen.administradores}</span>
            </Tabs.Trigger>
            <Tabs.Trigger value="Propietario" className="usuarios-tab-trigger">
              Propietarios <span>{resumen.propietarios}</span>
            </Tabs.Trigger>
            <Tabs.Trigger value="Operario" className="usuarios-tab-trigger">
              Operarios <span>{resumen.operarios}</span>
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>
      ) : (
        <span className="usuarios-toolbar-count" aria-live="polite">
          {visibles} de {total}
        </span>
      )}
    </div>
  )
}

export default BarraUsuarios
