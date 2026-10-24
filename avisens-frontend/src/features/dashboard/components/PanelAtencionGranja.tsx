import { useMemo, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { IcAlert, IcChart, IcCheck, IcChevronRight, IcThermo } from '@shared/ui/icons/icons'
import type { ItemAtencionGranja, TipoAtencionGranja } from '../model/resumenGranja'

type Filtro = 'todas' | TipoAtencionGranja

type Props = {
  items: ItemAtencionGranja[]
  cargando: boolean
  errorCrecimiento?: string
  onReintentarCrecimiento?: () => void
  onAbrir: (item: ItemAtencionGranja) => void
  onIrAlertas: () => void
  onIrMonitoreo: () => void
  onIrBitacora: () => void
}

function PanelAtencionGranja({ items, cargando, errorCrecimiento, onReintentarCrecimiento, onAbrir, onIrAlertas, onIrMonitoreo, onIrBitacora }: Props) {
  const [pestana, setPestana] = useState<Filtro>('todas')
  const alertas = items.filter((item) => item.tipo === 'alerta').length
  const sensores = items.filter((item) => item.tipo === 'sensor').length
  const crecimiento = items.filter((item) => item.tipo === 'crecimiento').length
  const criticos = items.filter((item) => item.critico).length
  const filtrados = useMemo(
    () => (pestana === 'todas' ? items : items.filter((item) => item.tipo === pestana)),
    [items, pestana],
  )

  return (
    <section className="admin-card admin-attention" aria-labelledby="resumen-atencion-titulo" aria-busy={cargando}>
      <div className="admin-card-head admin-attention-head">
        <div>
          <div className="admin-card-title-row">
            <h2 id="resumen-atencion-titulo" className="admin-card-title">Necesita tu atención</h2>
            {!cargando && criticos > 0 && (
              <span className="admin-attention-badge is-critical">
                {criticos} {criticos === 1 ? 'crítica' : 'críticas'}
              </span>
            )}
          </div>
          <p className="admin-card-sub">Alertas, señales de crecimiento y sensores que necesitan revisión</p>
        </div>

        {!cargando && items.length > 0 && (
          <Tabs.Root value={pestana} onValueChange={(valor) => setPestana(valor as Filtro)}>
            <Tabs.List className="admin-tabs-list" aria-label="Filtrar pendientes">
              <Tabs.Trigger value="todas" className="admin-tab-trigger">Todas <span>{items.length}</span></Tabs.Trigger>
              <Tabs.Trigger value="alerta" className="admin-tab-trigger">Alertas <span>{alertas}</span></Tabs.Trigger>
              <Tabs.Trigger value="crecimiento" className="admin-tab-trigger">Crecimiento <span>{crecimiento}</span></Tabs.Trigger>
              <Tabs.Trigger value="sensor" className="admin-tab-trigger">Sensores <span>{sensores}</span></Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        )}
      </div>

      {errorCrecimiento && <p className="admin-attention-error" role="alert">
        {errorCrecimiento} No podemos confirmar el estado de crecimiento de los lotes.
        {onReintentarCrecimiento && <button type="button" onClick={onReintentarCrecimiento}>Reintentar</button>}
      </p>}

      {cargando ? (
        <div className="admin-attention-loading" aria-label="Cargando pendientes">
          <span /><span /><span />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="admin-attention-empty">
          <span className="admin-attention-empty-icon" aria-hidden="true">{errorCrecimiento ? <IcAlert size={18} /> : <IcCheck size={18} />}</span>
          <div>
            <strong>{errorCrecimiento && items.length === 0 ? 'No pudimos revisar los lotes' : items.length === 0 ? 'Sin alertas o fallas de sensores' : 'Nada pendiente en esta categoría'}</strong>
            <p>
              {errorCrecimiento && items.length === 0
                ? 'Vuelve a intentarlo para consultar las reglas de crecimiento.'
                : items.length === 0
                ? 'No hay alertas abiertas y los sensores de esta granja reportan dentro de su rango.'
                : 'Selecciona «Todas» para ver el resto de pendientes.'}
            </p>
          </div>
        </div>
      ) : (
        <ul className="admin-attention-list">
          {filtrados.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`admin-attention-item resumen-atencion-item--${item.tipo}${item.critico ? ' is-critico' : ''}`}
                onClick={() => onAbrir(item)}
              >
                <span className="admin-attention-icon" aria-hidden="true">
                  {item.tipo === 'alerta' ? <IcAlert size={16} /> : item.tipo === 'crecimiento' ? <IcChart size={16} /> : <IcThermo size={16} />}
                </span>
                <span className="admin-attention-copy">
                  <span className="admin-attention-meta">
                    <strong>{item.etiqueta}</strong>
                    {item.cuando && <time>{item.cuando}</time>}
                  </span>
                  <span className="admin-attention-title">{item.titulo}</span>
                  <span className="admin-attention-detail">{item.detalle}</span>
                </span>
                <IcChevronRight size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer className="admin-attention-footer">
        <button type="button" className="admin-attention-shortcut" onClick={onIrAlertas}>
          Alertas <IcChevronRight size={12} />
        </button>
        <button type="button" className="admin-attention-shortcut" onClick={onIrMonitoreo}>
          Monitoreo <IcChevronRight size={12} />
        </button>
        <button type="button" className="admin-attention-shortcut" onClick={onIrBitacora}>
          Bitácora <IcChevronRight size={12} />
        </button>
      </footer>
    </section>
  )
}

export default PanelAtencionGranja
