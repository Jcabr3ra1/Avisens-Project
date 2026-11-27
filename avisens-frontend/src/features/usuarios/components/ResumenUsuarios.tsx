import type { ReactNode } from 'react'
import { IcAlert, IcCheck, IcSettings, IcUserCircle, IcUsers } from '@shared/ui/icons/icons'
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

type TonoKpi = 'primario' | 'ok' | 'info' | 'alerta' | 'peligro'

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
      tono: TonoKpi
      icono: ReactNode
    }> = [
      {
        id: 'todos',
        etiqueta: 'Operarios',
        valor: resumen.total,
        detalle: 'Personal de tu organización',
        tono: 'primario',
        icono: <IcUsers size={15} />,
      },
      {
        id: 'activos',
        etiqueta: 'Con acceso activo',
        valor: resumen.activos,
        detalle: 'Habilitados para registrar en galpón',
        tono: 'ok',
        icono: <IcCheck size={15} />,
      },
      {
        id: 'inactivos',
        etiqueta: 'Inactivos',
        valor: resumen.inactivos,
        detalle: 'Acceso suspendido',
        tono: resumen.inactivos > 0 ? 'alerta' : 'info',
        icono: resumen.inactivos > 0 ? <IcAlert size={15} /> : <IcUserCircle size={15} />,
      },
    ]

    return (
      <section className="adm-kpis adm-kpis--3" aria-label="Filtrar operarios por estado">
        {itemsPropietario.map((item) => {
          const activo = estadoActivo === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={`adm-kpi adm-kpi--${item.tono}${activo ? ' is-activo' : ''}`}
              aria-pressed={activo}
              onClick={() => onSeleccionarEstado(activo && item.id !== 'todos' ? 'todos' : item.id)}
            >
              <span className="adm-kpi-cab">
                <span className="adm-kpi-etiqueta">{item.etiqueta}</span>
                <span className="adm-kpi-icono" aria-hidden="true">{item.icono}</span>
              </span>
              <strong className="adm-kpi-valor">{item.valor}</strong>
              <span className="adm-kpi-nota">{item.detalle}</span>
            </button>
          )
        })}
      </section>
    )
  }

  const items: Array<{
    id: FiltroRolUsuario
    etiqueta: string
    valor: number
    detalle: string
    tono: TonoKpi
    icono: ReactNode
  }> = [
    {
      id: 'todos',
      etiqueta: 'Total cuentas',
      valor: resumen.total,
      detalle: `${resumen.activos} con acceso activo`,
      tono: 'primario',
      icono: <IcUsers size={15} />,
    },
    {
      id: 'Administrador',
      etiqueta: 'Administradores',
      valor: resumen.administradores,
      detalle: 'Gobierno global y soporte',
      tono: 'info',
      icono: <IcSettings size={15} />,
    },
    {
      id: 'Propietario',
      etiqueta: 'Propietarios',
      valor: resumen.propietarios,
      detalle: 'Titulares de organizaciones y granjas',
      tono: 'ok',
      icono: <IcUserCircle size={15} />,
    },
    {
      id: 'Operario',
      etiqueta: 'Operarios',
      valor: resumen.operarios,
      detalle: 'Bitácora, pesajes y consumo en galpón',
      tono: 'alerta',
      icono: <IcUsers size={15} />,
    },
  ]

  return (
    <section className="adm-kpis" aria-label="Filtrar resumen por rol">
      {items.map((item) => {
        const activo = rolActivo === item.id
        return (
          <button
            key={item.id}
            type="button"
            className={`adm-kpi adm-kpi--${item.tono}${activo ? ' is-activo' : ''}`}
            aria-pressed={activo}
            onClick={() => onSeleccionarRol(activo && item.id !== 'todos' ? 'todos' : item.id)}
          >
            <span className="adm-kpi-cab">
              <span className="adm-kpi-etiqueta">{item.etiqueta}</span>
              <span className="adm-kpi-icono" aria-hidden="true">{item.icono}</span>
            </span>
            <strong className="adm-kpi-valor">{item.valor}</strong>
            <span className="adm-kpi-nota">{item.detalle}</span>
          </button>
        )
      })}
    </section>
  )
}

export default ResumenUsuarios
