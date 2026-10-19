import { useMemo, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { IcAlert, IcCheck, IcChevronRight, IcClock, IcDoc } from '@shared/ui/icons/icons'
import type { ItemAtencionAdmin, ResumenAtencionAdmin, TipoAtencionAdmin } from '../model/adminResumen'
import { hace } from '../model/adminResumen'
import AnimacionAvisens from '@shared/ui/Animacion/AnimacionAvisens'

type FiltroAtencion = 'todas' | TipoAtencionAdmin

type Props = ResumenAtencionAdmin & {
  cargando: boolean
  error: string
  onAbrir: (item: ItemAtencionAdmin) => void
  onReintentar: () => void
  onIrAlertas: () => void
  onIrPqrs: () => void
  onIrRecuperaciones: () => void
}

function iconoTipo(tipo: ItemAtencionAdmin['tipo']) {
  if (tipo === 'alerta') return <IcAlert size={16} />
  if (tipo === 'recuperacion') return <IcClock size={16} />
  return <IcDoc size={16} />
}

function PanelAtencionAdmin({
  items,
  alertasCriticas,
  solicitudesPendientes,
  recuperacionesPendientes,
  cargando,
  error,
  onAbrir,
  onReintentar,
  onIrAlertas,
  onIrPqrs,
  onIrRecuperaciones,
}: Props) {
  const [pestana, setPestana] = useState<FiltroAtencion>('todas')

  const alertasEnBandeja = useMemo(
    () => items.filter((item) => item.tipo === 'alerta').length,
    [items],
  )

  const filtrados = useMemo(
    () => (pestana === 'todas' ? items : items.filter((item) => item.tipo === pestana)),
    [items, pestana],
  )

  return (
    <section className="admin-card admin-attention" aria-labelledby="admin-attention-title" aria-busy={cargando}>
      <div className="admin-card-head admin-attention-head">
        <div>
          <div className="admin-card-title-row">
            <h2 id="admin-attention-title" className="admin-card-title">
              Necesita tu atención
            </h2>
            {!cargando && alertasCriticas > 0 && (
              <span className="admin-attention-badge is-critical">
                {alertasCriticas} {alertasCriticas === 1 ? 'crítica' : 'críticas'}
              </span>
            )}
          </div>
          <p className="admin-card-sub">
            Alertas activas, solicitudes PQRS y recuperaciones de acceso por resolver
          </p>
        </div>

        {!cargando && items.length > 0 && (
          <Tabs.Root value={pestana} onValueChange={(v) => setPestana(v as FiltroAtencion)}>
            <Tabs.List className="admin-tabs-list" aria-label="Filtrar pendientes por categoría">
              <Tabs.Trigger value="todas" className="admin-tab-trigger">
                Todas <span>{items.length}</span>
              </Tabs.Trigger>
              <Tabs.Trigger value="alerta" className="admin-tab-trigger">
                Alertas <span>{alertasEnBandeja}</span>
              </Tabs.Trigger>
              <Tabs.Trigger value="solicitud" className="admin-tab-trigger">
                PQRS <span>{solicitudesPendientes}</span>
              </Tabs.Trigger>
              <Tabs.Trigger value="recuperacion" className="admin-tab-trigger">
                Accesos <span>{recuperacionesPendientes}</span>
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        )}
      </div>

      {error ? (
        <div className="admin-inline-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onReintentar}>
            Reintentar
          </button>
        </div>
      ) : cargando ? (
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
            <strong>
              {items.length === 0
                ? 'Bandeja operativa al día'
                : 'Sin pendientes en esta categoría'}
            </strong>
            <p>
              {items.length === 0
                ? 'No hay alertas activas, solicitudes PQRS ni recuperaciones de contraseña pendientes.'
                : 'Selecciona «Todas» para ver el resto de los elementos por atender.'}
            </p>
          </div>
        </div>
      ) : (
        <ul className="admin-attention-list">
          {filtrados.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`admin-attention-item admin-attention-item--${item.tipo}`}
                onClick={() => onAbrir(item)}
              >
                <span className="admin-attention-icon" aria-hidden="true">
                  {iconoTipo(item.tipo)}
                </span>
                <span className="admin-attention-copy">
                  <span className="admin-attention-meta">
                    <strong>{item.etiqueta}</strong>
                    <time>{hace(item.fecha)}</time>
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
        <button type="button" className="admin-attention-shortcut" onClick={onIrPqrs}>
          Bandeja PQRS <IcChevronRight size={12} />
        </button>
        <button type="button" className="admin-attention-shortcut" onClick={onIrRecuperaciones}>
          Recuperaciones <IcChevronRight size={12} />
        </button>
      </footer>
    </section>
  )
}

export default PanelAtencionAdmin
