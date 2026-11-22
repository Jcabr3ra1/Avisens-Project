import { useState } from 'react'
import { IcArrowRight, IcChevronDown, IcChevronRight } from '@shared/ui/icons/icons'
import type { ItemAtencionGranja } from '../model/resumenGranja'
import { fraseDePendiente, type Semaforo } from '../model/semaforo'
import IconoTono from './IconoTono'

const VISIBLES = 3

type Props = {
  semaforo: Semaforo
  errorCrecimiento: string
  onAbrir: (item: ItemAtencionGranja) => void
  onReintentarCrecimiento: () => void
}

function SemaforoGranja({ semaforo, errorCrecimiento, onAbrir, onReintentarCrecimiento }: Props) {
  const [verTodos, setVerTodos] = useState(false)
  const { tono, titulo, frase, principal, otros, textoBoton } = semaforo
  const mostrados = verTodos ? otros : otros.slice(0, VISIBLES)
  const ocultos = otros.length - VISIBLES

  return (
    <section
      className={`rp-tarjeta rp-semaforo rp-semaforo--${tono}`}
      aria-labelledby="rp-semaforo-titulo"
      aria-busy={tono === 'revisando'}
    >
      <div className="rp-semaforo-cab">
        <div className="rp-semaforo-estado" role="status" aria-live="polite">
          <span className="rp-semaforo-icono" aria-hidden="true"><IconoTono tono={tono} size={24} /></span>
          <div>
            <h2 id="rp-semaforo-titulo" className="rp-semaforo-titulo">{titulo}</h2>
            <p className="rp-semaforo-frase">{frase}</p>
          </div>
        </div>
        {principal && textoBoton && (
          <button type="button" className="rp-boton rp-boton--primario" onClick={() => onAbrir(principal)}>
            {textoBoton}
            <IcArrowRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      {errorCrecimiento && (
        <p className="rp-aviso" role="alert">
          No fue posible consultar las reglas de crecimiento.
          <button type="button" className="rp-boton rp-boton--secundario" onClick={onReintentarCrecimiento}>
            Reintentar
          </button>
        </p>
      )}

      {otros.length > 0 && (
        <div className="rp-pendientes">
          <h3 className="rp-etiqueta">{principal ? `Otros pendientes (${otros.length})` : `Pendientes (${otros.length})`}</h3>
          <ul className="rp-pendientes-lista">
            {mostrados.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`rp-pendiente rp-tono-${item.critico ? 'critico' : 'atencion'}`}
                  onClick={() => onAbrir(item)}
                >
                  <span className="rp-punto" aria-hidden="true" />
                  <span className="rp-pendiente-texto">{fraseDePendiente(item)}</span>
                  <span className="rp-pendiente-nivel">{item.critico ? 'Urgente' : 'Revisar'}</span>
                  <IcChevronRight size={18} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {ocultos > 0 && (
            <button
              type="button"
              className="rp-boton rp-boton--texto"
              aria-expanded={verTodos}
              onClick={() => setVerTodos((actual) => !actual)}
            >
              {verTodos ? 'Ver menos' : `Ver todos (${otros.length})`}
              <IcChevronDown size={16} aria-hidden="true" className={verTodos ? 'rp-girado' : undefined} />
            </button>
          )}
        </div>
      )}
    </section>
  )
}

export default SemaforoGranja
