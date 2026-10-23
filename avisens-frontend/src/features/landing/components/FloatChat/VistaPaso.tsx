import { useEffect, useRef, type FormEvent } from 'react'
import Ic from '@shared/ui/Ic/Ic'
import { seLeenEnPar } from '@features/landing/model/opcionesChat'
import type { PreguntaChatbot } from '@features/landing/api/chatbot'

type Props = {
  pregunta: PreguntaChatbot
  bloque: string | null
  paso: string | null
  enviando: boolean
  aviso: string | null
  texto: string
  onTexto: (valor: string) => void
  onEnviar: (valor: string) => void
}

const LARGO_TEXTO_LARGO = 110

// Una pregunta por pantalla. Las respuestas cortas se eligen de una lista (o de
// a dos si es un sí o no) y las abiertas se escriben con un botón de continuar.
function VistaPaso({ pregunta, bloque, paso, enviando, aviso, texto, onTexto, onEnviar }: Props) {
  const opciones = pregunta.opciones ?? []
  const largo = pregunta.texto.length > LARGO_TEXTO_LARGO
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (opciones.length === 0 && !enviando) campo.current?.focus()
  }, [pregunta.codigo, enviando, opciones.length])

  function alEnviar(evento: FormEvent) {
    evento.preventDefault()
    if (texto.trim()) onEnviar(texto)
  }

  return (
    <div className="float-paso" key={pregunta.codigo} aria-busy={enviando}>
      {paso ? <p className="float-paso-progreso">{paso}</p> : null}
      {bloque ? <p className="float-paso-bloque">{bloque}</p> : null}

      {largo
        ? <p className="float-paso-texto">{pregunta.texto}</p>
        : <h3 className="float-paso-titulo">{pregunta.texto}</h3>}

      {opciones.length > 0 ? (
        seLeenEnPar(opciones) ? (
          <div className="float-paso-par">
            {opciones.map((opcion) => (
              <button key={opcion} type="button" onClick={() => onEnviar(opcion)} disabled={enviando}>
                {opcion}
              </button>
            ))}
          </div>
        ) : (
          <ul className="float-dudas-lista float-paso-lista">
            {opciones.map((opcion) => (
              <li key={opcion}>
                <button type="button" onClick={() => onEnviar(opcion)} disabled={enviando}>
                  <span>{opcion}</span>
                  <Ic d="M9 18l6-6-6-6" size={15} />
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <form className="float-paso-form" onSubmit={alEnviar}>
          <input
            ref={campo}
            className="float-paso-campo"
            aria-label={pregunta.texto}
            placeholder={pregunta.tipo === 'numero' ? 'Escribe un número' : 'Escribe tu respuesta'}
            value={texto}
            onChange={(evento) => onTexto(evento.target.value)}
            inputMode={pregunta.tipo === 'numero' ? 'numeric' : 'text'}
            disabled={enviando}
          />
          <button type="submit" className="float-paso-continuar" disabled={enviando || !texto.trim()}>
            Continuar
          </button>
        </form>
      )}

      {aviso ? <p className="float-paso-aviso" role="alert">{aviso}</p> : null}
      {enviando ? <div className="float-dots" role="status" aria-label="AVIA está escribiendo"><span /><span /><span /></div> : null}
    </div>
  )
}

export default VistaPaso
