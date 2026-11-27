import { lazy, Suspense, useState } from 'react'
import { IcChevronDown } from '@shared/ui/icons/icons'
import type { ClimaVisual } from '@features/granjas/propietario/climaVisual'
import type { SensorEscena } from '../model/escenaGalpon'

const GalponConSensores = lazy(() => import('./GalponConSensores'))

type Props = {
  nombre: string
  sensores: SensorEscena[]
  aves: number
  diaLote: number | null
  clima: ClimaVisual
}

function GalponPorDentro({ nombre, sensores, aves, diaLote, clima }: Props) {
  const [abierto, setAbierto] = useState(false)

  return (
    <section className="rp-bloque rp-por-dentro" aria-labelledby="rp-dentro-titulo">
      <h2 id="rp-dentro-titulo" className="rp-solo-lector">Vista 3D del galpón</h2>
      <button
        type="button"
        className="rp-boton rp-boton--secundario"
        aria-expanded={abierto}
        aria-controls="rp-dentro-visor"
        onClick={() => setAbierto((actual) => !actual)}
      >
        {abierto ? 'Ocultar vista 3D del galpón' : 'Ver vista 3D del galpón'}
        <IcChevronDown size={16} aria-hidden="true" className={abierto ? 'rp-girado' : undefined} />
      </button>

      <div id="rp-dentro-visor" hidden={!abierto}>
        {abierto && (
          <Suspense fallback={<p className="rp-meta" role="status">Cargando vista 3D…</p>}>
            <p className="rp-meta">{nombre} en tiempo real. Selecciona un sensor para ver su detalle.</p>
            <GalponConSensores nombre={nombre} sensores={sensores} aves={aves} diaLote={diaLote} clima={clima} />
          </Suspense>
        )}
      </div>
    </section>
  )
}

export default GalponPorDentro
