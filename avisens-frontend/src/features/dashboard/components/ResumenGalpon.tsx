import type { ReactNode } from 'react'
import type { SensorEscena } from '../model/escenaGalpon'
import type { ClimaVisual } from '@features/granjas/propietario/climaVisual'
import GalponConSensores from './GalponConSensores'

type Props = {
  titulo: string
  detalle: string
  etiqueta: string | null
  sensores: SensorEscena[]
  aves: number
  diaLote: number | null
  clima: ClimaVisual
  lote: ReactNode
}

function ResumenGalpon({ titulo, detalle, etiqueta, sensores, aves, diaLote, clima, lote }: Props) {
  return (
    <section className="rsm-galpon-resumen" aria-labelledby="resumen-galpon-titulo">
      <header className="rsm-cabecera">
        <div>
          <h2 id="resumen-galpon-titulo" className="rsm-titulo rsm-titulo--grande">{titulo}</h2>
          <p className="rsm-subtitulo">{detalle}</p>
        </div>
        {etiqueta && <span className="rsm-etiqueta rsm-etiqueta--ok">{etiqueta}</span>}
      </header>

      <div className="rsm-galpon-resumen-cuerpo">
        <GalponConSensores nombre={titulo} sensores={sensores} aves={aves} diaLote={diaLote} clima={clima} />
        <div className="rsm-lateral">{lote}</div>
      </div>
    </section>
  )
}

export default ResumenGalpon
