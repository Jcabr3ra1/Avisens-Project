import { IcSun } from '@shared/ui/icons/icons'
import { useRiesgoCalor } from '@features/granjas/propietario/useRiesgoCalor'
import { calorSencillo } from '../model/calorSencillo'

function CalorProximo({ galponId }: { galponId: number }) {
  const { riesgo, problema, cargando } = useRiesgoCalor(galponId, 0)
  const calor = riesgo ? calorSencillo(riesgo) : null

  return (
    <section className={`rp-tarjeta rp-calor rp-tono-${calor?.tono ?? 'sin_datos'}`} aria-labelledby="rp-calor-titulo">
      <div className="rp-cab">
        <h2 id="rp-calor-titulo" className="rp-titulo">Riesgo de calor</h2>
        <p className="rp-cab-meta">Próximas 72 h</p>
      </div>

      {cargando ? (
        <p className="rp-meta" role="status">Consultando el pronóstico…</p>
      ) : problema ? (
        <p className="rp-meta">
          {problema.tipo === 'sin_ubicacion'
            ? 'La granja no tiene ubicación registrada; sin ella no se calcula el riesgo de calor.'
            : 'Pronóstico no disponible en este momento.'}
        </p>
      ) : calor ? (
        <div className="rp-calor-cuerpo">
          <span className="rp-calor-icono" aria-hidden="true"><IcSun size={22} /></span>
          <div>
            <p className="rp-calor-titulo">{calor.titulo}</p>
            <p className="rp-calor-detalle">{calor.detalle}</p>
            {calor.consejo && <p className="rp-calor-consejo">{calor.consejo}</p>}
          </div>
        </div>
      ) : (
        <p className="rp-meta">Sin pronóstico para este galpón.</p>
      )}
    </section>
  )
}

export default CalorProximo
