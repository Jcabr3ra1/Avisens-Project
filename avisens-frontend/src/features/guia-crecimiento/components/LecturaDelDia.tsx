import type { AnomaliaLote, CurvaCrecimiento } from '@features/predicciones/api/predicciones'
import { etiquetaConfianza } from '../model/confianza'
import { formatearPeso } from '../model/proyeccion'
import { lecturaDelDia, textoDeLlegada } from '../model/reglaCiclo'
import type { InfoEtapaDia } from '../model/etapasAlimentacion'
import { ChipDesvio, ConteoValor } from './Medidas'

type Props = {
  curva: CurvaCrecimiento | null
  dia: number
  referencia: string | null
  alertasDelDia: AnomaliaLote[]
  etapaDia?: InfoEtapaDia | null
}

function LecturaDelDia({ curva, dia, referencia, alertasDelDia, etapaDia }: Props) {
  const lectura = lecturaDelDia(curva, dia)
  const suficiente = (curva?.modelo.puntos_usados ?? 0) >= 3
  const final = curva?.serie[curva.serie.length - 1]
  const llegada = curva ? textoDeLlegada(curva) : null
  const nivel = etiquetaConfianza(curva?.modelo.nivel_confianza)
  const motivos = curva?.modelo.motivos ?? []
  const futuro = curva !== null && dia > curva.dia_actual

  return (
    <aside className="gdc-lectura" aria-labelledby="gdc-lectura-titulo" aria-live="polite">
      <header className="gdc-lectura-cabecera">
        <h3 id="gdc-lectura-titulo">Día {dia}</h3>
        {lectura?.esHoy && <span className="gdc-lectura-sello">Hoy</span>}
        {futuro && <span className="gdc-lectura-sello gdc-lectura-sello--tenue">Estimado</span>}
      </header>

      {etapaDia && (
        <div className={`gdc-lectura-etapa gdc-lectura-etapa--${etapaDia.etapa}`}>
          <div className="gdc-lectura-etapa-cabecera">
            <span className={`regla-etapa-punto regla-etapa-punto--${etapaDia.etapa}`} aria-hidden="true" />
            <strong className="gdc-lectura-etapa-nombre">Etapa: {etapaDia.nombreEtapa}</strong>
            <span className="gdc-lectura-etapa-dias">({etapaDia.diaInicio === etapaDia.diaFin ? `Día ${etapaDia.diaInicio}` : `Días ${etapaDia.diaInicio}–${etapaDia.diaFin}`})</span>
          </div>
          <div className="gdc-lectura-alimento">
            <span className="gdc-lectura-alimento-etiqueta">Alimento recomendado:</span>
            <span className="gdc-lectura-alimento-valor">{etapaDia.alimento}</span>
          </div>
          {etapaDia.diasParaCambio > 0 && etapaDia.proximaEtapa && (
            <p className="gdc-lectura-etapa-cambio">
              Cambio en {etapaDia.diasParaCambio} {etapaDia.diasParaCambio === 1 ? 'día' : 'días'} a <strong>{etapaDia.proximaEtapa}</strong> ({etapaDia.proximoAlimento})
            </p>
          )}
        </div>
      )}

      {lectura ? (
        <dl className="gdc-lectura-lista">
          <div>
            <dt>Pesaje real</dt>
            <dd>
              {lectura.real === null
                ? <span className="gdc-lectura-vacio">Sin pesaje este día</span>
                : <ConteoValor valor={lectura.real} formatear={formatearPeso} />}
              {lectura.desvioPct !== null && referencia && <ChipDesvio pct={lectura.desvioPct} referencia={referencia} />}
            </dd>
          </div>
          {suficiente && (
            <div>
              <dt>Proyectado</dt>
              <dd>
                <ConteoValor valor={lectura.proyectado} formatear={formatearPeso} />
                <small>Entre {formatearPeso(lectura.minimo)} y {formatearPeso(lectura.maximo)}</small>
              </dd>
            </div>
          )}
          <div>
            <dt>{referencia ? `Curva ${referencia}` : 'Curva estándar'}</dt>
            <dd><ConteoValor valor={lectura.estandar} formatear={formatearPeso} /></dd>
          </div>
        </dl>
      ) : (
        <p className="gdc-lectura-vacio">Aún no hay datos para este día.</p>
      )}

      {curva && !suficiente && (
        <p className="gdc-lectura-vacio">La proyección y el rango aparecen con pesajes de tres días distintos.</p>
      )}

      {alertasDelDia.length > 0 && (
        <ul className="gdc-lectura-alertas">
          {alertasDelDia.map((alerta) => <li key={alerta.tipo}>{alerta.mensaje}</li>)}
        </ul>
      )}

      {curva && suficiente && final && llegada && (
        <section className="gdc-lectura-cierre" aria-label="Cómo cierra el lote">
          <h4>Al día {curva.dia_final}</h4>
          <p className="gdc-lectura-final">
            <ConteoValor valor={curva.resumen.peso_final_g} formatear={formatearPeso} />
            <small>Entre {formatearPeso(final.min_g)} y {formatearPeso(final.max_g)}</small>
          </p>
          <p className={`gdc-lectura-llegada${llegada.tenue ? ' gdc-lectura-llegada--tenue' : ''}`}>
            <span>{llegada.etiqueta}:</span> <strong>{llegada.valor}</strong> · {llegada.detalle}
          </p>
          {nivel && curva.modelo.nivel_confianza && (
            <p className={`gdc-confianza gdc-confianza--${curva.modelo.nivel_confianza}`}>{nivel}</p>
          )}
          {motivos.length > 0 && (
            <ul className="gdc-lectura-motivos">
              {motivos.map((motivo) => <li key={motivo}>{motivo}</li>)}
            </ul>
          )}
        </section>
      )}
    </aside>
  )
}

export default LecturaDelDia
