import { IcAlert, IcCheck } from '@shared/ui/icons/icons'
import type { DashboardAlerta } from '../model/dashboard'

interface AlertasPrioritariasProps {
  alertas: DashboardAlerta[]
  onVerTodas: () => void
}

function AlertasPrioritarias({ alertas, onVerTodas }: AlertasPrioritariasProps) {
  const visibles = alertas.slice(0, 3)

  return (
    <section className="dashboard-panel dashboard-alerts" aria-labelledby="alertas-prioritarias-title">
      <div className="dashboard-panel__heading dashboard-panel__heading--inline">
        <div>
          <p className="dashboard-section-label">Prioridad</p>
          <h2 id="alertas-prioritarias-title">Alertas por revisar</h2>
        </div>
        {alertas.length > 0 && (
          <button className="dashboard-text-button" type="button" onClick={onVerTodas}>
            Ver todas
          </button>
        )}
      </div>

      {visibles.length === 0 ? (
        <div className="dashboard-empty-inline">
          <span aria-hidden="true"><IcCheck size={24} /></span>
          <div>
            <strong>No hay alertas abiertas</strong>
            <p>Cuando ocurra una situación importante aparecerá aquí.</p>
          </div>
        </div>
      ) : (
        <ul className="dashboard-alert-list">
          {visibles.map((alerta) => (
            <li key={alerta.id}>
              <span className="dashboard-alert-list__icon" aria-hidden="true">
                <IcAlert size={19} />
              </span>
              <div>
                <strong>{alerta.mensaje || alerta.tipo}</strong>
                <span>
                  {alerta.criticidad} · {new Date(alerta.fechaCreacion).toLocaleString('es-CO', {
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default AlertasPrioritarias
