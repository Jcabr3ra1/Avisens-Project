import type { ReactNode } from 'react'

interface Props {
  etiqueta: string
  valor: ReactNode
  sufijo?: string
  tono?: 'normal' | 'atencion' | 'alerta'
}

// Un dato suelto: etiqueta pequeña arriba, valor grande abajo. Es la unidad
// con la que se arman los bloques de Operación, Ambiente y Consumo.
function Dato({ etiqueta, valor, sufijo, tono = 'normal' }: Props) {
  const vacio = valor === null || valor === undefined || valor === ''
  return (
    <div className={`gd-dato gd-dato--${tono}`}>
      <span className="gd-dato-etiqueta">{etiqueta}</span>
      <span className="gd-dato-valor">
        {vacio ? <span className="gd-sin-dato">—</span> : valor}
        {!vacio && sufijo && <small>{sufijo}</small>}
      </span>
    </div>
  )
}

export default Dato
