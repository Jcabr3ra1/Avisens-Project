import { useMemo, useState, type CSSProperties } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import IconoFigma from '@shared/ui/icons/IconoFigma'
import { hace, type ItemAtencionAdmin, type ResumenAtencionAdmin, type TipoAtencionAdmin } from '../model/adminResumen'

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

const ICONO_TIPO = { alerta: 'alarma', solicitud: 'archivo', recuperacion: 'reloj' } as const

function PanelAtencionAdmin({
  items,
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
  const alertas = useMemo(() => items.filter((item) => item.tipo === 'alerta').length, [items])
  const filtrados = useMemo(
    () => (pestana === 'todas' ? items : items.filter((item) => item.tipo === pestana)),
    [items, pestana],
  )

  return (
    <section id="admin-bandeja" className="cdc-panel cdc-bandeja cdc-entra" style={{ '--i': 5 } as CSSProperties} aria-labelledby="cdc-bandeja-titulo" aria-busy={cargando}>
      <header className="cdc-panel-cabecera">
        <div>
          <h2 id="cdc-bandeja-titulo">Bandeja de atención</h2>
          <p>Alertas, solicitudes PQRS y recuperaciones de acceso por resolver</p>
        </div>
        {!cargando && items.length > 0 && (
          <Tabs.Root value={pestana} onValueChange={(valor) => setPestana(valor as FiltroAtencion)}>
            <Tabs.List className="cdc-segmentos" aria-label="Filtrar pendientes por categoría">
              <Tabs.Trigger value="todas">Todas <span>{items.length}</span></Tabs.Trigger>
              <Tabs.Trigger value="alerta">Alertas <span>{alertas}</span></Tabs.Trigger>
              <Tabs.Trigger value="solicitud">PQRS <span>{solicitudesPendientes}</span></Tabs.Trigger>
              <Tabs.Trigger value="recuperacion">Accesos <span>{recuperacionesPendientes}</span></Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        )}
      </header>

      {error ? (
        <div className="cdc-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onReintentar}>Reintentar</button>
        </div>
      ) : cargando ? (
        <div className="cdc-filas-esqueleto" aria-label="Cargando pendientes"><span /><span /><span /></div>
      ) : filtrados.length === 0 ? (
        <div className="cdc-vacio">
          <IconoFigma nombre="verificado" tamano={28} />
          <strong>{items.length === 0 ? 'Nada por resolver' : 'Sin pendientes en esta categoría'}</strong>
          <p>
            {items.length === 0
              ? 'Cuando llegue una alerta, una PQRS o una recuperación de acceso aparecerá aquí.'
              : 'Elige «Todas» para ver el resto de los casos.'}
          </p>
        </div>
      ) : (
        <ul className="cdc-casos" key={pestana}>
          {filtrados.map((item, posicion) => (
            <li key={item.id} style={{ '--k': posicion } as CSSProperties}>
              <button type="button" className={`cdc-caso cdc-caso--${item.tipo}${item.prioridad >= 3 ? ' is-urgente' : ''}`} onClick={() => onAbrir(item)}>
                <span className="cdc-caso-icono" aria-hidden="true"><IconoFigma nombre={ICONO_TIPO[item.tipo]} tamano={17} /></span>
                <span className="cdc-caso-texto">
                  <span className="cdc-caso-meta">{item.etiqueta} · <time dateTime={item.fecha}>{hace(item.fecha)}</time></span>
                  <strong>{item.titulo}</strong>
                  <small>{item.detalle}</small>
                </span>
                <IconoFigma nombre="flecha-derecha" tamano={16} className="cdc-flecha" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer className="cdc-panel-pie">
        <button type="button" onClick={onIrAlertas}>Alertas</button>
        <button type="button" onClick={onIrPqrs}>Bandeja PQRS</button>
        <button type="button" onClick={onIrRecuperaciones}>Recuperaciones</button>
      </footer>
    </section>
  )
}

export default PanelAtencionAdmin
