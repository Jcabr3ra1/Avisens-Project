import { useState } from 'react'
import GraficoRiesgoCalor from '@features/predicciones/components/GraficoRiesgoCalor'
import {
  franjasCalor, horasEnRiesgo, resumenAccesibleRiesgo, textoAjuste,
} from '@features/predicciones/model/riesgoCalor'
import '@fontsource-variable/oswald'
import type { GalponConLotes } from '../../hooks/useEstructuraGranjas'
import { sensoresReportando } from '../explorador'
import { useRiesgoCalor } from '../useRiesgoCalor'
import AhoraGalpon from './ambiente/AhoraGalpon'
import HistoricosGalpon from './ambiente/HistoricosGalpon'
import { MapaTermicoGalpon } from './ambiente/MapaTermicoGalpon'
import PronosticoDias from './ambiente/PronosticoDias'
import SensoresGalpon from './ambiente/SensoresGalpon'
import './ambiente/AmbientePestana.css'

type ModoAmbiente = 'sensores' | 'clima' | 'historicos' | 'completo'

type Props = {
  galpon: GalponConLotes
  revision: number
  modo?: ModoAmbiente
  onCompletarUbicacion?: () => void
  onIrABitacora?: (loteId: number) => void
  onCambioEstructura?: () => void
}

function SeccionClimaCalor({
  galpon,
  revision,
  onCompletarUbicacion,
}: {
  galpon: GalponConLotes
  revision: number
  onCompletarUbicacion?: () => void
}) {
  const [reintento, setReintento] = useState(0)
  const { riesgo, problema, cargando } = useRiesgoCalor(galpon.id, revision + reintento)

  return (
    <>
      <AhoraGalpon
        riesgo={riesgo}
        problema={problema}
        cargando={cargando}
        sensores={galpon.sensores}
        onCompletarUbicacion={onCompletarUbicacion}
        onReintentar={() => setReintento((valor) => valor + 1)}
      />

      {riesgo && (
        <>
          <PronosticoDias riesgo={riesgo} />

          <section className="amb-tarjeta amb-grafico" aria-labelledby="amb-grafico-titulo">
            <div className="amb-seccion-cabecera">
              <div>
                <span className="amb-rotulo amb-rotulo--suave">Tendencia 72 horas</span>
                <h3 id="amb-grafico-titulo">Índice de calor hora a hora</h3>
                <p>El índice THI une temperatura y humedad: es como sienten el calor las aves.</p>
              </div>
              <span className="amb-conteo">{horasEnRiesgo(riesgo)} de {riesgo.serie.length} horas con riesgo</span>
            </div>
            <GraficoRiesgoCalor
              serie={riesgo.serie}
              franjas={franjasCalor(riesgo.lote?.dia_vida)}
              descripcion={resumenAccesibleRiesgo(riesgo)}
            />
            <p className="amb-fuente">
              {textoAjuste(riesgo)} · Pronóstico de Open-Meteo · Índice THI de Tao y Xin (2003)
            </p>
          </section>
        </>
      )}
    </>
  )
}

function AmbientePestana({
  galpon,
  revision,
  modo = 'completo',
  onCompletarUbicacion,
  onIrABitacora,
  onCambioEstructura,
}: Props) {
  const { reportando } = sensoresReportando(galpon)

  if (modo === 'sensores') {
    return (
      <div className="amb">
        <SensoresGalpon sensores={galpon.sensores} reportando={reportando} />
      </div>
    )
  }

  if (modo === 'clima') {
    return (
      <div className="amb">
        <SeccionClimaCalor
          galpon={galpon}
          revision={revision}
          onCompletarUbicacion={onCompletarUbicacion}
        />
      </div>
    )
  }

  if (modo === 'historicos') {
    return (
      <div className="amb">
        <HistoricosGalpon galpon={galpon} />
      </div>
    )
  }

  return (
    <div className="amb">
      <MapaTermicoGalpon
        key={galpon.id}
        galpon={galpon}
        onIrABitacora={onIrABitacora}
        onGuardado={onCambioEstructura}
      />
      <SeccionClimaCalor
        galpon={galpon}
        revision={revision}
        onCompletarUbicacion={onCompletarUbicacion}
      />
      <SensoresGalpon sensores={galpon.sensores} reportando={reportando} />
    </div>
  )
}

export default AmbientePestana
