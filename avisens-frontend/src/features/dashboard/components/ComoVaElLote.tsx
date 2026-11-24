import { useMemo, type ReactNode } from 'react'
import { IcArrowRight, IcCal, IcDoc, IcHeart, IcScale, IcSeed } from '@shared/ui/icons/icons'
import { useCurvaLote } from '@features/granjas/propietario/useCurvaLote'
import type { ComparacionIndicador } from '@features/indicadores/api/indicadores'
import type { DashboardIndicador, DashboardLote } from '../model/dashboard'
import { lineaSparkline } from '../model/estadoLote'
import { textoNoAlcanza, textoVenta } from '../model/faena'
import { resumenLote, type MedidaLote } from '../model/resumenLote'
import { IcPollo } from './IconosLote'

export type AccionLote = { texto: string; onClick: () => void }

type Props = {
  nombreGalpon: string
  lote: DashboardLote | null
  indicadores: DashboardIndicador[]
  comparacion: ComparacionIndicador | null
  seriePeso: number[]
  diaLote: number | null
  cargando: boolean
  accion: AccionLote | null
  onAbrirBitacora?: () => void
}

const enteros = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const DIAS_CICLO_REFERENCIA = 42

const ICONOS: Record<MedidaLote['clave'], ReactNode> = {
  peso: <IcScale size={15} aria-hidden="true" />,
  mortalidad: <IcHeart size={15} aria-hidden="true" />,
  conversion: <IcSeed size={15} aria-hidden="true" />,
}

const ORDEN: MedidaLote['clave'][] = ['mortalidad', 'peso', 'conversion']

const TITULOS: Record<MedidaLote['clave'], string> = {
  mortalidad: 'Mortalidad',
  peso: 'Peso promedio',
  conversion: 'Conversión (FCR)',
}

function tonoDeMedida(medida: MedidaLote): 'primario' | 'ok' | 'info' | 'alerta' | 'peligro' {
  const tono = medida.juicio?.tono
  if (tono === 'critico') return 'peligro'
  if (tono === 'atencion') return 'alerta'
  if (tono === 'ok') return 'ok'
  return medida.clave === 'conversion' ? 'info' : 'primario'
}

function sinDato(clave: MedidaLote['clave']): MedidaLote {
  return { clave, titulo: TITULOS[clave], cifra: '—', comparacion: 'Sin dato', juicio: null, ayuda: null }
}

function MiniTendencia({ serie }: { serie: number[] }) {
  if (serie.length < 2) return null
  return (
    <svg className="rp-kpi-tendencia" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={lineaSparkline(serie, 100, 28)} />
    </svg>
  )
}

function ComoVaElLote({
  nombreGalpon,
  lote,
  indicadores,
  comparacion,
  seriePeso,
  diaLote,
  cargando,
  accion,
  onAbrirBitacora,
}: Props) {
  const { curva } = useCurvaLote(lote?.id ?? null, 0)
  const resumen = useMemo(
    () => (lote ? resumenLote({ lote, indicadores, comparacion }) : null),
    [lote, indicadores, comparacion],
  )
  const medidas: MedidaLote[] = resumen
    ? ORDEN.map((clave) => resumen.medidas.find((medida) => medida.clave === clave) ?? sinDato(clave))
    : []
  const noAlcanza = textoNoAlcanza(curva)
  const venta = resumen?.venta ?? null
  const progresoReferencia = diaLote !== null
    ? Math.min(100, Math.max(4, Math.round((diaLote / DIAS_CICLO_REFERENCIA) * 100)))
    : 0

  return (
    <section className="rp-tarjeta rp-lote" aria-labelledby="rp-lote-titulo" aria-busy={cargando}>
      <div className="rp-cab">
        <div>
          <span className="rp-kicker">Lote activo</span>
          <h2 id="rp-lote-titulo" className="rp-titulo">{lote ? `Lote ${lote.codigo}` : 'Lote en curso'}</h2>
          <p className="rp-cab-meta">{nombreGalpon}</p>
        </div>
        {lote && diaLote !== null && (
          <span className="rp-lote-dia">
            <IcCal size={15} aria-hidden="true" />
            Día {diaLote}
            <span className="rp-meta"> / {venta ? venta.diaVenta : DIAS_CICLO_REFERENCIA}</span>
          </span>
        )}
      </div>

      {cargando ? (
        <div className="rp-esqueleto-lote" role="status" aria-label="Cargando datos del lote">
          <span /><span /><span /><span />
        </div>
      ) : !lote || !resumen ? (
        <p className="rp-vacio">{nombreGalpon} no tiene un lote activo.</p>
      ) : (
        <>
          {venta ? (
            <div className="rp-venta">
              <div
                className="rp-barra"
                role="progressbar"
                aria-label="Avance del lote"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(venta.progreso * 100)}
                aria-valuetext={`Día ${venta.diaActual} de ${venta.diaVenta}`}
              >
                <span style={{ width: `${Math.round(venta.progreso * 100)}%` }} />
              </div>
              <p className="rp-meta">{textoVenta(venta)}</p>
            </div>
          ) : (
            <div className="rp-venta">
              <div
                className="rp-barra"
                role="progressbar"
                aria-label="Avance estimado del ciclo"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progresoReferencia}
                aria-valuetext={`Día ${diaLote ?? 1} de ${DIAS_CICLO_REFERENCIA}`}
              >
                <span style={{ width: `${progresoReferencia}%` }} />
              </div>
              <p className="rp-meta">Ciclo de referencia (42 días) · Sin fecha de venta programada</p>
            </div>
          )}

          <ul className="rp-lote-grid">
            <li>
              <div className="adm-kpi adm-kpi--primario">
                <span className="adm-kpi-cab">
                  <span className="adm-kpi-etiqueta">Aves vivas</span>
                  <span className="adm-kpi-icono" aria-hidden="true"><IcPollo size={15} /></span>
                </span>
                <strong className="adm-kpi-valor">{enteros.format(resumen.pollos.vivos)}</strong>
                <span className="adm-kpi-nota">de {enteros.format(resumen.pollos.ingresados)} ingresadas</span>
              </div>
            </li>
            {medidas.map((medida) => {
              const tono = tonoDeMedida(medida)
              return (
                <li key={medida.clave}>
                  <div className={`adm-kpi adm-kpi--${tono} rp-tono-${medida.juicio?.tono ?? 'sin_datos'}`}>
                    <span className="adm-kpi-cab">
                      <span className="adm-kpi-etiqueta">{TITULOS[medida.clave]}</span>
                      <span className="adm-kpi-icono" aria-hidden="true">{ICONOS[medida.clave]}</span>
                    </span>
                    <strong className="adm-kpi-valor">{medida.cifra}</strong>
                    <span className="adm-kpi-nota rp-kpi-comparacion">
                      <span>{medida.comparacion}</span>
                      {medida.juicio && (
                        <span className="rp-estado">
                          <span className="rp-punto" aria-hidden="true" />
                          {medida.juicio.palabra}
                        </span>
                      )}
                    </span>
                    {medida.ayuda && <span className="rp-meta">{medida.ayuda}</span>}
                    {medida.clave === 'peso' && <MiniTendencia serie={seriePeso} />}
                  </div>
                </li>
              )
            })}
          </ul>

          {noAlcanza && <p className="rp-nota rp-tono-atencion">{noAlcanza}</p>}

          {(accion || onAbrirBitacora) && (
            <div className="rp-lote-acciones">
              {onAbrirBitacora && (
                <button type="button" className="rp-boton rp-boton--secundario" onClick={onAbrirBitacora}>
                  <IcDoc size={15} aria-hidden="true" />
                  Abrir bitácora
                </button>
              )}
              {accion && (
                <button type="button" className="rp-boton rp-boton--primario" onClick={accion.onClick}>
                  {accion.texto}
                  <IcArrowRight size={15} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default ComoVaElLote
