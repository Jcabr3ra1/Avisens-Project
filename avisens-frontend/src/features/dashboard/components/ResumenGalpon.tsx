import type { ReactNode } from 'react'
import type { FilaGalpon } from '../model/resumenGranja'
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
  galpones: FilaGalpon[]
  galponId: number | null
  onSeleccionar: (id: number) => void
}

function ResumenGalpon({ titulo, detalle, etiqueta, sensores, aves, diaLote, clima, lote, galpones, galponId, onSeleccionar }: Props) {
  return (
    <section className="rsm-galpon-resumen" aria-labelledby="resumen-galpon-titulo">
      <header className="rsm-cabecera">
        <div>
          <h2 id="resumen-galpon-titulo" className="rsm-titulo rsm-titulo--grande">{titulo}</h2>
          <p className="rsm-subtitulo">{detalle}</p>
        </div>
        {etiqueta && <span className="rsm-etiqueta rsm-etiqueta--ok">{etiqueta}</span>}
      </header>

      {galpones.length > 1 && (
        <div className="rsm-galpon-pestanas" role="group" aria-label="Galpones de la granja">
          {galpones.map((galpon) => {
            const aviso = galpon.urgentes > 0 ? 'critico' : galpon.alertas > 0 ? 'atencion' : null
            return (
              <button
                key={galpon.id}
                type="button"
                className="rsm-galpon-pestana"
                aria-pressed={galpon.id === galponId}
                onClick={() => onSeleccionar(galpon.id)}
              >
                {galpon.nombre}
                {aviso && <span className={`rsm-galpon-aviso rsm-galpon-aviso--${aviso}`} role="img" aria-label={aviso === 'critico' ? 'Con alertas críticas' : 'Con alertas'} />}
                {!galpon.activo && <small>inactivo</small>}
              </button>
            )
          })}
        </div>
      )}

      <div className="rsm-galpon-resumen-cuerpo">
        <GalponConSensores nombre={titulo} sensores={sensores} aves={aves} diaLote={diaLote} clima={clima} />
        <div className="rsm-lateral">{lote}</div>
      </div>
    </section>
  )
}

export default ResumenGalpon
