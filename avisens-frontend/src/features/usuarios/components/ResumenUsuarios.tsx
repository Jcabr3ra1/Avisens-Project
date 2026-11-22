import type { FiltroEstadoUsuario, FiltroRolUsuario } from '../hooks/useFiltroUsuarios'
import type { ResumenDeUsuarios } from '../hooks/useResumenUsuarios'

type Props = {
  resumen: ResumenDeUsuarios
  esPropietario: boolean
  rolActivo: FiltroRolUsuario
  estadoActivo: FiltroEstadoUsuario
  onSeleccionarRol: (rol: FiltroRolUsuario) => void
  onSeleccionarEstado: (estado: FiltroEstadoUsuario) => void
}

function ResumenUsuarios({
  resumen,
  esPropietario,
  rolActivo,
  estadoActivo,
  onSeleccionarRol,
  onSeleccionarEstado,
}: Props) {
  if (esPropietario) {
    const itemsPropietario: Array<{
      id: FiltroEstadoUsuario
      etiqueta: string
      valor: number
      detalle: string
      tono: string
    }> = [
      {
        id: 'todos',
        etiqueta: 'Operarios',
        valor: resumen.total,
        detalle: 'Personal de tu organización',
        tono: 'todos',
      },
      {
        id: 'activos',
        etiqueta: 'Con acceso activo',
        valor: resumen.activos,
        detalle: 'Habilitados para registrar en galpón',
        tono: 'administrador',
      },
      {
        id: 'inactivos',
        etiqueta: 'Inactivos',
        valor: resumen.inactivos,
        detalle: 'Acceso suspendido',
        tono: 'operario',
      },
    ]

    return (
      <section className="usuarios-kpis usuarios-kpis--triple" aria-label="Filtrar operarios por estado">
        {itemsPropietario.map((item) => {
          const activo = estadoActivo === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={`usuarios-kpi usuarios-kpi--${item.tono}${activo ? ' is-active' : ''}`}
              aria-pressed={activo}
              onClick={() => onSeleccionarEstado(activo && item.id !== 'todos' ? 'todos' : item.id)}
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
