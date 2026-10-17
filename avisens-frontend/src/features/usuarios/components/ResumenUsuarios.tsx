import type { FiltroRolUsuario } from '../hooks/useFiltroUsuarios'
import type { ResumenDeUsuarios } from '../hooks/useResumenUsuarios'

type Props = {
  resumen: ResumenDeUsuarios
  esPropietario: boolean
  rolActivo: FiltroRolUsuario
  onSeleccionarRol: (rol: FiltroRolUsuario) => void
}

function ResumenUsuarios({
  resumen,
  esPropietario,
  rolActivo,
  onSeleccionarRol,
}: Props) {
  if (esPropietario) {
    return (
      <section className="usuarios-kpis usuarios-kpis--doble" aria-label="Resumen de operarios">
        <div className="usuarios-kpi is-static">
          <span className="usuarios-kpi-label">Operarios registrados</span>
          <strong className="usuarios-kpi-value">{resumen.total}</strong>
          <span className="usuarios-kpi-detail">Personal de tu organización</span>
        </div>
        <div className="usuarios-kpi is-static">
          <span className="usuarios-kpi-label">Con acceso activo</span>
          <strong className="usuarios-kpi-value">{resumen.activos}</strong>
          <span className="usuarios-kpi-detail">Habilitados para registrar en galpón</span>
        </div>
      </section>
    )
  }

  const items: {
    id: FiltroRolUsuario
    etiqueta: string
    valor: number
    detalle: string
    tono: string
  }[] = [
    {
      id: 'todos',
      etiqueta: 'Total cuentas',
      valor: resumen.total,
      detalle: `${resumen.activos} con acceso activo`,
      tono: 'todos',
    },
    {
      id: 'Administrador',
      etiqueta: 'Administradores',
      valor: resumen.administradores,
      detalle: 'Gobierno global y soporte',
      tono: 'administrador',
    },
    {
      id: 'Propietario',
      etiqueta: 'Propietarios',
      valor: resumen.propietarios,
      detalle: 'Titulares de organizaciones y granjas',
      tono: 'propietario',
    },
    {
      id: 'Operario',
      etiqueta: 'Operarios',
      valor: resumen.operarios,
      detalle: 'Bitácora, pesajes y consumo en galpón',
      tono: 'operario',
    },
  ]

  return (
    <section className="usuarios-kpis" aria-label="Filtrar resumen por rol">
      {items.map((item) => {
        const activo = rolActivo === item.id
        return (
          <button
            key={item.id}
            type="button"
            className={`usuarios-kpi usuarios-kpi--${item.tono}${activo ? ' is-active' : ''}`}
            aria-pressed={activo}
            onClick={() => onSeleccionarRol(activo && item.id !== 'todos' ? 'todos' : item.id)}
          >
            <span className="usuarios-kpi-head">
              <span className="usuarios-kpi-dot" aria-hidden="true" />
              <span className="usuarios-kpi-label">{item.etiqueta}</span>
            </span>
            <strong className="usuarios-kpi-value">{item.valor}</strong>
            <span className="usuarios-kpi-detail">{item.detalle}</span>
          </button>
        )
      })}
    </section>
  )
}

export default ResumenUsuarios
