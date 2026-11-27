import { useMemo, useState, type CSSProperties } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import IconoFigma from '@shared/ui/icons/IconoFigma'
import type { Organizacion } from '@features/organizaciones/api/organizaciones'
import { hace } from '../model/adminResumen'

type FiltroEstado = 'todas' | 'activas' | 'inactivas'

type Props = {
  organizaciones: Organizacion[]
  cargando: boolean
  onAbrirOrganizacion: (id: number) => void
  onVerTodas: () => void
  onIrCrm: () => void
}

const LIMITE = 6

function etiquetaPlan(plan: string): string {
  const planes: Record<string, string> = { free: 'Inicial', pro: 'Profesional', enterprise: 'Empresarial' }
  return planes[plan.toLowerCase()] ?? plan
}

function iniciales(nombre: string): string {
  const palabras = nombre.replace(/^organizaci[oó]n de\s+/i, '').split(/\s+/).filter(Boolean)
  return palabras.slice(0, 2).map((palabra) => palabra[0]).join('').toUpperCase() || 'O'
}

function PanelOrganizacionesAdmin({ organizaciones, cargando, onAbrirOrganizacion, onVerTodas, onIrCrm }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<FiltroEstado>('todas')
  const mostrarHerramientas = organizaciones.length > 4

  const conteos = useMemo(() => {
    const activas = organizaciones.filter((org) => org.activa).length
    return { todas: organizaciones.length, activas, inactivas: organizaciones.length - activas }
  }, [organizaciones])

  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return organizaciones.filter((org) => {
      if (filtro === 'activas' && !org.activa) return false
      if (filtro === 'inactivas' && org.activa) return false
      if (!termino) return true
      return org.nombre.toLowerCase().includes(termino)
        || (org.nit?.toLowerCase().includes(termino) ?? false)
        || org.plan.toLowerCase().includes(termino)
    })
  }, [busqueda, filtro, organizaciones])
  const visibles = filtradas.slice(0, LIMITE)

  return (
    <section className="cdc-seccion" aria-labelledby="cdc-orgs-titulo" aria-busy={cargando}>
      <header className="cdc-seccion-cabecera">
        <div>
          <h2 id="cdc-orgs-titulo">Organizaciones cliente</h2>
          <p>Cuentas registradas, su plan y la estructura que ya montaron</p>
        </div>
        <button type="button" className="cdc-enlace" onClick={onVerTodas}>
          Directorio completo <IconoFigma nombre="flecha-derecha" tamano={14} />
        </button>
      </header>

      {mostrarHerramientas && (
        <div className="cdc-orgs-herramientas">
          <label className="cdc-buscador">
            <IconoFigma nombre="buscar" tamano={16} />
            <input
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar por nombre, NIT o plan"
              aria-label="Buscar organizaciones por nombre, NIT o plan"
            />
          </label>
          <Tabs.Root value={filtro} onValueChange={(valor) => setFiltro(valor as FiltroEstado)}>
            <Tabs.List className="cdc-segmentos" aria-label="Filtrar organizaciones por estado">
              <Tabs.Trigger value="todas">Todas <span>{conteos.todas}</span></Tabs.Trigger>
              <Tabs.Trigger value="activas">Activas <span>{conteos.activas}</span></Tabs.Trigger>
              {conteos.inactivas > 0 && <Tabs.Trigger value="inactivas">Inactivas <span>{conteos.inactivas}</span></Tabs.Trigger>}
            </Tabs.List>
          </Tabs.Root>
        </div>
      )}

      {cargando ? (
        <div className="cdc-orgs-grilla" aria-label="Cargando organizaciones">
          {[0, 1, 2].map((indice) => <span key={indice} className="cdc-org cdc-org--esqueleto" />)}
        </div>
      ) : visibles.length === 0 ? (
        <div className="cdc-panel cdc-vacio">
          <IconoFigma nombre="carpetas" tamano={22} />
          <strong>{organizaciones.length === 0 ? 'Aún no hay organizaciones cliente' : 'Ninguna organización coincide'}</strong>
          <p>
            {organizaciones.length === 0
              ? 'Crea una empresa avícola o convierte un prospecto calificado desde el CRM.'
              : 'Prueba con otro término o cambia el filtro de estado.'}
          </p>
          {organizaciones.length === 0 && (
            <span className="cdc-vacio-acciones">
              <button type="button" className="cdc-boton-primario" onClick={onVerTodas}>Crear organización</button>
              <button type="button" className="cdc-boton-secundario" onClick={onIrCrm}>Revisar prospectos</button>
            </span>
          )}
        </div>
      ) : (
        <ul className="cdc-orgs-grilla" key={`${filtro}-${busqueda}`}>
          {visibles.map((org, posicion) => (
            <li key={org.id} style={{ '--k': posicion } as CSSProperties}>
              <button
                type="button"
                className={`cdc-org${org.activa ? '' : ' is-inactiva'}`}
                onClick={() => onAbrirOrganizacion(org.id)}
                aria-label={`Abrir la ficha de ${org.nombre}`}
              >
                <span className="cdc-org-cabecera">
                  <span className="cdc-org-avatar" aria-hidden="true">
                    {iniciales(org.nombre)}
                    <i />
                  </span>
                  <span className="cdc-org-plan">{etiquetaPlan(org.plan)}</span>
                </span>
                <span className="cdc-org-nombre">{org.nombre}</span>
                <span className="cdc-org-meta">
                  {org.activa ? 'Operación activa' : 'Suspendida'} · {org.nit ? `NIT ${org.nit}` : 'Sin NIT'}
                </span>
                <span className="cdc-org-datos">
                  <span><strong>{org._count.granjas}</strong>{org._count.granjas === 1 ? 'granja' : 'granjas'}</span>
                  <span><strong>{org._count.usuarios}</strong>{org._count.usuarios === 1 ? 'persona' : 'personas'}</span>
                </span>
                <span className="cdc-org-pie">
                  {org.ultima_actividad ? `Actividad ${hace(org.ultima_actividad)}` : 'Sin actividad registrada'}
                  <IconoFigma nombre="flecha-derecha" tamano={15} className="cdc-flecha" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!cargando && filtradas.length > LIMITE && (
        <button type="button" className="cdc-enlace cdc-orgs-mas" onClick={onVerTodas}>
          Ver las {filtradas.length} organizaciones <IconoFigma nombre="flecha-derecha" tamano={14} />
        </button>
      )}
    </section>
  )
}

export default PanelOrganizacionesAdmin
