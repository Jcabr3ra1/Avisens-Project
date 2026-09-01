import { useEffect, useRef, useState } from 'react'

export type AccionMenu = {
  etiqueta: string
  onSeleccionar: () => void
  peligrosa?: boolean
}

// Menú de tres puntos para las acciones secundarias, de modo que cada
// tarjeta no termine con una fila de botones compitiendo por atención.
function MenuAcciones({ acciones, etiqueta }: { acciones: AccionMenu[]; etiqueta: string }) {
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    function alClicFuera(evento: MouseEvent) {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false)
    }
    function alEscape(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', alClicFuera)
    document.addEventListener('keydown', alEscape)
    return () => {
      document.removeEventListener('mousedown', alClicFuera)
      document.removeEventListener('keydown', alEscape)
    }
  }, [abierto])

  if (acciones.length === 0) return null

  return (
    <div className="gr-menu" ref={contenedor}>
      <button
        type="button"
        className="gr-menu-disparador"
        aria-label={etiqueta}
        aria-expanded={abierto}
        aria-haspopup="menu"
        onClick={(evento) => {
          evento.stopPropagation()
          setAbierto((previo) => !previo)
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>
      {abierto && (
        <div className="gr-menu-lista" role="menu">
          {acciones.map((accion) => (
            <button
              key={accion.etiqueta}
              type="button"
              role="menuitem"
              className={accion.peligrosa ? 'gr-menu-item gr-menu-item--peligro' : 'gr-menu-item'}
              onClick={(evento) => {
                evento.stopPropagation()
                setAbierto(false)
                accion.onSeleccionar()
              }}
            >
              {accion.etiqueta}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default MenuAcciones
