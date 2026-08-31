import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { getRolVista } from '@shared/api'
import { IcChat, IcClose, IcMic, IcSparkle, IcUsers } from '@shared/ui/icons/icons'
import { type PestanaComunicacion } from '../model/comunicacion'
import PanelEquipo from './PanelEquipo'
import PanelIa from './PanelIa'
import PanelVoz from './PanelVoz'
import './ComunicacionPanel.css'

type Props = {
  abierto: boolean
  pestanaInicial: PestanaComunicacion
  galponId: number | null
  galponNombre: string | null
  onCerrar: () => void
}

const pestanas = [
  { id: 'equipo' as const, etiqueta: 'Equipo', icono: IcUsers },
  { id: 'ia' as const, etiqueta: 'IA', icono: IcSparkle },
  { id: 'voz' as const, etiqueta: 'Voz', icono: IcMic },
]

function ComunicacionPanel({ abierto, pestanaInicial, galponId, galponNombre, onCerrar }: Props) {
  const [pestana, setPestana] = useState<PestanaComunicacion>(pestanaInicial)
  const panelRef = useRef<HTMLElement>(null)
  const disparadorRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!abierto) return
    setPestana(pestanaInicial)
    disparadorRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const marco = window.requestAnimationFrame(() => panelRef.current?.focus())
    return () => window.cancelAnimationFrame(marco)
  }, [abierto, pestanaInicial])

  useEffect(() => {
    if (abierto) return
    disparadorRef.current?.focus()
  }, [abierto])

  if (!abierto) return null

  const manejarTeclado = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCerrar()
      return
    }

    if (event.key !== 'Tab') return
    const elementos = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), [tabindex="0"]',
    )
    if (!elementos?.length) return
    const primero = elementos[0]
    const ultimo = elementos[elementos.length - 1]
    if (event.shiftKey && document.activeElement === primero) {
      event.preventDefault()
      ultimo.focus()
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault()
      primero.focus()
    }
  }

  return (
    <div className="comunicacion-layer" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCerrar()
    }}>
      <aside
        ref={panelRef}
        className="comunicacion-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="comunicacion-title"
        tabIndex={-1}
        onKeyDown={manejarTeclado}
      >
        <header className="comunicacion-panel__header">
          <span className="comunicacion-panel__badge" aria-hidden="true"><IcChat size={23} /></span>
          <div>
            <h2 id="comunicacion-title">Comunicación</h2>
            <p>{galponNombre ? `Contexto: ${galponNombre}` : 'Consulta y coordinación de producción'}</p>
          </div>
          <button type="button" className="comunicacion-panel__close" onClick={onCerrar} aria-label="Cerrar comunicación">
            <IcClose size={22} aria-hidden="true" />
          </button>
        </header>

        <div className="comunicacion-tabs" role="tablist" aria-label="Canales de comunicación">
          {pestanas.map(({ id, etiqueta, icono: Icono }) => (
            <button
              key={id}
              id={`comunicacion-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={pestana === id}
              aria-controls={`comunicacion-panel-${id}`}
              className={pestana === id ? 'is-active' : ''}
              onClick={() => setPestana(id)}
            >
              <Icono size={18} aria-hidden="true" />
              {etiqueta}
            </button>
          ))}
        </div>

        <div className="comunicacion-panel__content" id={`comunicacion-panel-${pestana}`} role="tabpanel" aria-labelledby={`comunicacion-tab-${pestana}`}>
          {pestana === 'equipo' && <PanelEquipo galponId={galponId} galponNombre={galponNombre} />}
          {pestana === 'ia' && <PanelIa puedeUsarCopiloto={['Administrador', 'Propietario'].includes(getRolVista() ?? '')} />}
          {pestana === 'voz' && <PanelVoz galponId={galponId} galponNombre={galponNombre} />}
        </div>
      </aside>
    </div>
  )
}

export default ComunicacionPanel
