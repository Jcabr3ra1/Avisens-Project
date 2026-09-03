import { IcAlert, IcBell, IcDoc, IcLeaf, IcRefresh, IcSearch } from '@shared/ui/icons/icons'
import type { DashboardGranja } from '../model/dashboard'

interface DashboardHeaderProps {
  nombre: string
  granjas: DashboardGranja[]
  granjaId: number | null
  actualizadoEn: Date | null
  cargando: boolean
  busqueda: string
  onGranjaChange: (id: number) => void
  onBusquedaChange: (valor: string) => void
  onRecargar: () => void
  onIrABitacora: () => void
  onIrAAlertas: () => void
  onIrANotificaciones: () => void
}

function DashboardHeader({
  nombre,
  granjas,
  granjaId,
  actualizadoEn,
  cargando,
  busqueda,
  onGranjaChange,
  onBusquedaChange,
  onRecargar,
  onIrABitacora,
  onIrAAlertas,
  onIrANotificaciones,
}: DashboardHeaderProps) {
  const fecha = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  const horaActualizacion = actualizadoEn
    ? actualizadoEn.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
    : 'Sin actualizar'

  return (
    <>
      <header className="dashboard-toolbar" aria-label="Herramientas del resumen">
        <label className="dashboard-toolbar__farm">
          <span className="dashboard-toolbar__farm-icon" aria-hidden="true"><IcLeaf size={20} /></span>
          <span className="dashboard-toolbar__farm-copy">
            <span>Granja activa</span>
            <select
              value={granjaId ?? ''}
              onChange={(event) => onGranjaChange(Number(event.target.value))}
              disabled={granjas.length === 0}
              aria-label="Seleccionar granja activa"
            >
              {granjas.map((granja) => (
                <option key={granja.id} value={granja.id}>{granja.nombre}</option>
              ))}
            </select>
          </span>
        </label>

        <label className="dashboard-toolbar__search">
          <IcSearch size={20} aria-hidden="true" />
          <input
            value={busqueda}
            onChange={(event) => onBusquedaChange(event.target.value)}
            placeholder="Buscar galpón o lote…"
            aria-label="Buscar galpón o lote en la granja activa"
          />
        </label>

        <div className="dashboard-toolbar__actions">
          <button type="button" className="dashboard-toolbar__action" onClick={onIrABitacora}>
            <IcDoc size={18} aria-hidden="true" />
            <span>Bitácora</span>
          </button>
          <button type="button" className="dashboard-toolbar__action" onClick={onIrAAlertas}>
            <IcAlert size={18} aria-hidden="true" />
            <span>Alertas</span>
          </button>
          <button type="button" className="dashboard-toolbar__icon-action" onClick={onIrANotificaciones} aria-label="Ver notificaciones">
            <IcBell size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="dashboard-header" aria-labelledby="dashboard-title">
        <div className="dashboard-header__identity">
          <span className="dashboard-header__icon" aria-hidden="true"><IcLeaf size={24} /></span>
          <div>
            <p className="dashboard-header__eyebrow">Resumen de hoy</p>
            <h1 id="dashboard-title">Hola, {nombre}</h1>
            <p className="dashboard-header__date">{fecha}</p>
          </div>
        </div>

        <button
          className="dashboard-refresh"
          type="button"
          onClick={onRecargar}
          disabled={cargando}
          aria-label="Actualizar el resumen"
        >
          <IcRefresh size={18} aria-hidden="true" />
          <span>{cargando ? 'Actualizando' : `Actualizado ${horaActualizacion}`}</span>
        </button>
      </section>
    </>
  )
}

export default DashboardHeader
