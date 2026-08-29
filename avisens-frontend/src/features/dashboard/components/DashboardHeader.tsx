import { IcLeaf, IcRefresh } from '@shared/ui/icons/icons'
import type { DashboardGalpon, DashboardGranja } from '../model/dashboard'

interface DashboardHeaderProps {
  nombre: string
  granjas: DashboardGranja[]
  galpones: DashboardGalpon[]
  granjaId: number | null
  galponId: number | null
  actualizadoEn: Date | null
  cargando: boolean
  onGranjaChange: (id: number) => void
  onGalponChange: (id: number) => void
  onRecargar: () => void
}

function DashboardHeader({
  nombre,
  granjas,
  galpones,
  granjaId,
  galponId,
  actualizadoEn,
  cargando,
  onGranjaChange,
  onGalponChange,
  onRecargar,
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
    <header className="dashboard-header">
      <div className="dashboard-header__identity">
        <span className="dashboard-header__icon" aria-hidden="true">
          <IcLeaf size={24} />
        </span>
        <div>
          <p className="dashboard-header__eyebrow">Resumen de hoy</p>
          <h1>Hola, {nombre}</h1>
          <p className="dashboard-header__date">{fecha}</p>
        </div>
      </div>

      <div className="dashboard-header__controls">
        <label className="dashboard-select">
          <span>Granja</span>
          <select
            value={granjaId ?? ''}
            onChange={(event) => onGranjaChange(Number(event.target.value))}
            disabled={granjas.length === 0}
          >
            {granjas.map((granja) => (
              <option key={granja.id} value={granja.id}>{granja.nombre}</option>
            ))}
          </select>
        </label>

        <label className="dashboard-select">
          <span>Galpón</span>
          <select
            value={galponId ?? ''}
            onChange={(event) => onGalponChange(Number(event.target.value))}
            disabled={galpones.length === 0}
          >
            {galpones.map((galpon) => (
              <option key={galpon.id} value={galpon.id}>
                {galpon.nombre} · {galpon.codigo}
              </option>
            ))}
          </select>
        </label>

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
      </div>
    </header>
  )
}

export default DashboardHeader
