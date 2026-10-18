import { useMemo, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { IcAlert, IcCheck, IcChevronRight, IcThermo } from '@shared/ui/icons/icons'
import AnimacionAvisens from '@shared/ui/Animacion/AnimacionAvisens'
import type { ItemAtencionGranja, TipoAtencionGranja } from '../model/resumenGranja'

type Filtro = 'todas' | TipoAtencionGranja

type Props = {
  items: ItemAtencionGranja[]
  cargando: boolean
  onAbrir: (item: ItemAtencionGranja) => void
  onIrAlertas: () => void
  onIrMonitoreo: () => void
  onIrBitacora: () => void
}

function PanelAtencionGranja({ items, cargando, onAbrir, onIrAlertas, onIrMonitoreo, onIrBitacora }: Props) {
  const [pestana, setPestana] = useState<Filtro>('todas')
  const alertas = items.filter((item) => item.tipo === 'alerta').length
  const sensores = items.length - alertas
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
          <p className="admin-card-sub">Alertas abiertas y sensores fuera de rango o sin señal en esta granja</p>
        </div>

        {!cargando && items.length > 0 && (
          <Tabs.Root value={pestana} onValueChange={(valor) => setPestana(valor as Filtro)}>
            <Tabs.List className="admin-tabs-list" aria-label="Filtrar pendientes">
              <Tabs.Trigger value="todas" className="admin-tab-trigger">Todas <span>{items.length}</span></Tabs.Trigger>
              <Tabs.Trigger value="alerta" className="admin-tab-trigger">Alertas <span>{alertas}</span></Tabs.Trigger>
              <Tabs.Trigger value="sensor" className="admin-tab-trigger">Sensores <span>{sensores}</span></Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        )}
      </div>

      {cargando ? (
        <div className="admin-attention-loading" aria-label="Cargando pendientes">
          <span /><span /><span />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="admin-attention-empty">
          <AnimacionAvisens
            nombre={items.length === 0 ? 'exito' : 'bandeja-vacia'}
            modo={items.length === 0 ? 'una-vez' : 'bucle'}
            tamano={56}
            respaldo={<span className="admin-attention-empty-icon" aria-hidden="true"><IcCheck size={18} /></span>}
          />
          <div>
            <strong>{items.length === 0 ? 'Todo en orden' : 'Nada pendiente en esta categoría'}</strong>
            <p>
              {items.length === 0
                ? 'No hay alertas abiertas y todos los sensores reportan dentro de su rango.'
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
                  {item.tipo === 'alerta' ? <IcAlert size={16} /> : <IcThermo size={16} />}
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
