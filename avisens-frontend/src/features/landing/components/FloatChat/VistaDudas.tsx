import type { CSSProperties } from 'react'
import Ic from '@shared/ui/Ic/Ic'

type Props = {
  titulo: string
  opciones: string[]
  deshabilitado: boolean
  error: string | null
  onElegir: (opcion: string) => void
}

const ES_ASESOR = /asesor/i

// Las preguntas frecuentes no son una conversación: son un menú. Se pintan
// como una lista que se lee de un vistazo, con la salida «hablar con un
// asesor» aparte y destacada, y sin campo de escribir.
function VistaDudas({ titulo, opciones, deshabilitado, error, onElegir }: Props) {
  const preguntas = opciones.filter((opcion) => !ES_ASESOR.test(opcion))
  const asesor = opciones.find((opcion) => ES_ASESOR.test(opcion))

  return (
    <div className="float-dudas">
      <h3 className="float-dudas-titulo">{titulo}</h3>
      <p className="float-dudas-sub">Toca una pregunta y te respondo.</p>

      <ul className="float-dudas-lista">
        {preguntas.map((pregunta, indice) => (
          <li key={pregunta} style={{ '--n': indice } as CSSProperties}>
            <button type="button" onClick={() => onElegir(pregunta)} disabled={deshabilitado}>
              <span>{pregunta}</span>
              <Ic d="M9 18l6-6-6-6" size={15} />
            </button>
          </li>
        ))}
      </ul>

      {asesor ? (
        <button type="button" className="float-dudas-asesor" onClick={() => onElegir(asesor)} disabled={deshabilitado}>
          <span>{asesor}</span>
          <Ic d="M5 12h14M13 6l6 6-6 6" size={16} />
        </button>
      ) : null}

      {error ? <p className="float-dudas-error" role="alert">{error}</p> : null}
    </div>
  )
}

export default VistaDudas
