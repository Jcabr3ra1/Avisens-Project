import { useMemo, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import * as Tooltip from '@radix-ui/react-tooltip'
import {
  IcArrowRight,
  IcBuilding,
  IcChevronRight,
  IcLeaf,
  IcSearch,
  IcUsers,
} from '@shared/ui/icons/icons'
import type { Organizacion } from '@features/organizaciones/api/organizaciones'

type FiltroEstado = 'todas' | 'activas' | 'inactivas'

type Props = {
  organizaciones: Organizacion[]
  cargando: boolean
  onAbrirOrganizacion: (id: number) => void
  onVerTodas: () => void
  onIrCrm: () => void
}

function etiquetaPlan(plan: string): string {
  const planes: Record<string, string> = {
    free: 'Inicial',
    pro: 'Profesional',
    enterprise: 'Empresarial',
  }
  return planes[plan.toLowerCase()] ?? plan
}

function PanelOrganizacionesAdmin({
  organizaciones,
  cargando,
  onAbrirOrganizacion,
  onVerTodas,
  onIrCrm,
}: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<FiltroEstado>('todas')
  const mostrarToolbar = organizaciones.length > 4

  const conteos = useMemo(() => {
    const activas = organizaciones.filter((org) => org.activa).length
    return {
      todas: organizaciones.length,
      activas,
      inactivas: organizaciones.length - activas,
    }
  }, [organizaciones])

  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return organizaciones
      .filter((org) => {
        if (filtro === 'activas' && !org.activa) return false
        if (filtro === 'inactivas' && org.activa) return false
        if (!termino) return true
        return (
          org.nombre.toLowerCase().includes(termino) ||
          (org.nit?.toLowerCase().includes(termino) ?? false) ||
          org.plan.toLowerCase().includes(termino)
        )
      })
      .slice(0, 6)
  }, [busqueda, filtro, organizaciones])

  return (
    <section className="admin-card admin-orgs" aria-labelledby="admin-orgs-title" aria-busy={cargando}>
      <div className="admin-card-head">
        <div>
          <h2 id="admin-orgs-title" className="admin-card-title">
            Organizaciones clientes
          </h2>
          <p className="admin-card-sub">
            Empresas avícolas registradas, granjas activas y equipo asignado
          </p>
        </div>
        <button type="button" className="admin-card-link" onClick={onVerTodas}>
          Directorio <IcChevronRight size={13} />
        </button>
      </div>

      {mostrarToolbar && (
        <div className="admin-orgs-toolbar">
          <label className="admin-orgs-search">
            <IcSearch size={15} aria-hidden="true" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Filtrar por nombre, NIT o plan…"
              aria-label="Filtrar organizaciones por nombre, NIT o plan"
            />
          </label>

          <Tabs.Root value={filtro} onValueChange={(valor) => setFiltro(valor as FiltroEstado)}>
            <Tabs.List className="admin-tabs-list" aria-label="Filtrar organizaciones por estado">
              <Tabs.Trigger value="todas" className="admin-tab-trigger">
                Todas <span>{conteos.todas}</span>
              </Tabs.Trigger>
              <Tabs.Trigger value="activas" className="admin-tab-trigger">
                Activas <span>{conteos.activas}</span>
              </Tabs.Trigger>
              {conteos.inactivas > 0 && (
                <Tabs.Trigger value="inactivas" className="admin-tab-trigger">
                  Inactivas <span>{conteos.inactivas}</span>
                </Tabs.Trigger>
              )}
            </Tabs.List>
          </Tabs.Root>
        </div>
      )}

      {cargando ? (
        <div className="admin-attention-loading" aria-label="Cargando organizaciones">
          <span /><span /><span />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="admin-orgs-empty">
          <span className="admin-orgs-empty-icon" aria-hidden="true">
            <IcBuilding size={18} />
          </span>
          <div className="admin-empty-body">
            <strong>
              {organizaciones.length === 0
                ? 'Aún no hay organizaciones clientes registradas'
                : 'Ninguna organización coincide con tu filtro'}
            </strong>
            <p>
              {organizaciones.length === 0
                ? 'Crea una empresa avícola manualmente o convierte un prospecto calificado desde el CRM.'
                : 'Prueba con otro término de búsqueda o cambia el filtro de estado.'}
            </p>
            {organizaciones.length === 0 && (
              <div className="admin-empty-actions">
                <button type="button" className="admin-btn-primary" onClick={onVerTodas}>
                  Crear organización
                </button>
                <button type="button" className="admin-btn-secondary" onClick={onIrCrm}>
                  Revisar prospectos
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <ul className="admin-orgs-list">
          {filtradas.map((org) => (
            <li key={org.id}>
              <button
                type="button"
                className="admin-org-row"
                onClick={() => onAbrirOrganizacion(org.id)}
              >
                <span
                  className={`admin-org-avatar${org.activa ? '' : ' is-inactive'}`}
                  aria-hidden="true"
                >
                  <IcBuilding size={16} />
                  <i className="admin-org-status-dot" />
                </span>

                <span className="admin-org-main">
                  <span className="admin-org-title-row">
                    <strong className="admin-org-name">{org.nombre}</strong>
                    <span className={`admin-org-plan admin-org-plan--${org.plan.toLowerCase()}`}>
                      {etiquetaPlan(org.plan)}
                    </span>
                  </span>
                  <span className="admin-org-meta">
                    {org.nit ? `NIT ${org.nit}` : 'Sin NIT registrado'} ·{' '}
                    {org.activa ? 'Operación activa' : 'Suspendida'}
                  </span>
                </span>

                <span className="admin-org-metrics" aria-label="Estructura de la organización">
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span className="admin-org-metric">
                        <IcLeaf size={13} aria-hidden="true" />
                        <strong>{org._count.granjas}</strong>
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content className="admin-tooltip" side="top" sideOffset={6}>
                        {org._count.granjas} {org._count.granjas === 1 ? 'granja registrada' : 'granjas registradas'}
                        <Tooltip.Arrow className="admin-tooltip-arrow" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>

                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span className="admin-org-metric">
                        <IcUsers size={13} aria-hidden="true" />
                        <strong>{org._count.usuarios}</strong>
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content className="admin-tooltip" side="top" sideOffset={6}>
                        {org._count.usuarios} {org._count.usuarios === 1 ? 'usuario asignado' : 'usuarios asignados'}
                        <Tooltip.Arrow className="admin-tooltip-arrow" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </span>

                <IcArrowRight size={14} className="admin-org-arrow" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer className="admin-attention-footer">
        <button type="button" className="admin-attention-shortcut" onClick={onVerTodas}>
          Gestionar organizaciones <IcChevronRight size={12} />
        </button>
        <button type="button" className="admin-attention-shortcut" onClick={onIrCrm}>
          Prospectos en CRM <IcChevronRight size={12} />
        </button>
      </footer>
    </section>
  )
}

export default PanelOrganizacionesAdmin
