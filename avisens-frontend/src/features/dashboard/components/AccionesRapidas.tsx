import type { ReactNode } from 'react'
import { IcAlert, IcChart, IcDoc, IcEye, IcSettings } from '@shared/ui/icons/icons'

interface Accion {
  titulo: string
  descripcion: string
  ruta: string
  icono: ReactNode
}

interface AccionesRapidasProps {
  puedeAdministrar: boolean
  onNavigate: (ruta: string) => void
}

function AccionesRapidas({ puedeAdministrar, onNavigate }: AccionesRapidasProps) {
  const acciones: Accion[] = [
    {
      titulo: 'Registrar en bitácora',
      descripcion: 'Peso, mortalidad o consumo',
      ruta: '/bitacora',
      icono: <IcDoc size={22} />,
    },
    {
      titulo: 'Revisar alertas',
      descripcion: 'Situaciones que requieren atención',
      ruta: '/alertas',
      icono: <IcAlert size={22} />,
    },
    {
      titulo: 'Ver monitoreo',
      descripcion: 'Lecturas ambientales del galpón',
      ruta: '/monitoreo',
      icono: <IcEye size={22} />,
    },
    puedeAdministrar
      ? {
          titulo: 'Administrar producción',
          descripcion: 'Granjas, galpones y lotes',
          ruta: '/granjas',
          icono: <IcSettings size={22} />,
        }
      : {
          titulo: 'Ver producción',
          descripcion: 'Consultar el resumen productivo',
          ruta: '/bitacora',
          icono: <IcChart size={22} />,
        },
  ]

  return (
    <section className="dashboard-panel" aria-labelledby="acciones-rapidas-title">
      <div className="dashboard-panel__heading">
        <div>
          <p className="dashboard-section-label">Accesos directos</p>
          <h2 id="acciones-rapidas-title">¿Qué necesitas hacer?</h2>
        </div>
      </div>
      <div className="dashboard-actions">
        {acciones.map((accion) => (
          <button
            className="dashboard-action"
            type="button"
            key={`${accion.ruta}-${accion.titulo}`}
            onClick={() => onNavigate(accion.ruta)}
          >
            <span className="dashboard-action__icon" aria-hidden="true">{accion.icono}</span>
            <span>
              <strong>{accion.titulo}</strong>
              <small>{accion.descripcion}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

export default AccionesRapidas
