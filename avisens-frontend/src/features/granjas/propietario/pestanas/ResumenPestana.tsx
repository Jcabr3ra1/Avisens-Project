import { lazy, Suspense } from 'react'
import type { Lote } from '@features/lotes/api/lotes'
import type { DashboardIndicador } from '@features/dashboard/model/dashboard'
import { resumenAccesible } from '@features/guia-crecimiento/model/proyeccion'
import { IcAlert, IcArrowRight, IcCheck, IcDoc, IcEye, IcScale } from '@shared/ui/icons/icons'
import type { GalponConLotes } from '../../hooks/useEstructuraGranjas'
import { avesActuales, diasDeVida, lecturaPorTipo } from '../../model/estructura'
import type { DestinoPaso, ProximoPaso } from '../explorador'
import { useCurvaLote } from '../useCurvaLote'

const GraficoCrecimiento = lazy(() => import('@shared/ui/graficos/GraficoCrecimiento'))

type Props = {
  galpon: GalponConLotes
  indicador: DashboardIndicador | null
  paso: ProximoPaso
  revision: number
  onDestino: (destino: DestinoPaso) => void
  onNavegar: (ruta: string) => void
}

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

function Cifra({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle?: string }) {
  return (
    <div className="gp-cifra">
      <dt>{etiqueta}</dt>
      <dd>{valor}</dd>
      {detalle && <dd className="gp-cifra-detalle">{detalle}</dd>}
    </div>
  )
}

function CurvaMini({ lote, revision, onNavegar }: { lote: Lote; revision: number; onNavegar: (ruta: string) => void }) {
  const { curva, problema, cargando } = useCurvaLote(lote.id, revision)
  if (cargando) return <div className="gp-curva-vacia" role="status">Calculando la curva del lote…</div>
  if (problema) {
    return (
      <div className="gp-curva-vacia">
        {problema.tipo === 'sin_pesajes'
          ? 'Con el primer pesaje aquí verás hacia dónde va el lote.'
          : problema.mensaje}
        {problema.tipo === 'error' && /bit[aá]cora/i.test(problema.mensaje) && (
          <button type="button" className="adm-btn adm-btn--primario" onClick={() => onNavegar(`/bitacora?lote=${lote.id}&vista=peso`)}>
            Corregir en la Bitácora
          </button>
        )}
      </div>
    )
  }
  if (!curva) return null
  const referencia = curva.referencias.genetica?.linea ?? null
  return (
    <Suspense fallback={<div className="gp-curva-vacia" role="status">Cargando gráfico…</div>}>
      <GraficoCrecimiento
        serie={curva.serie}
        diaActual={curva.dia_actual}
        pesoObjetivoG={curva.peso_objetivo_g}
        etiquetaEstandar={referencia}
        etiquetaMarca={null}
        descripcion={resumenAccesible(curva, referencia)}
        altura={240}
      />
    </Suspense>
  )
}

function ResumenPestana({ galpon, indicador, paso, revision, onDestino, onNavegar }: Props) {
  const lote = galpon.loteEnCurso
  const temperatura = lecturaPorTipo(galpon.sensores, 'temp')
  const humedad = lecturaPorTipo(galpon.sensores, 'hum')
  const vivas = lote ? avesActuales(lote.cantidad_inicial, indicador?.mortalidadAcumuladaPct ?? null) : 0

  return (
    <div className="gp-resumen">
      <dl className="gp-cifras">
        <Cifra etiqueta="Día de vida" valor={lote ? String(diasDeVida(lote.fecha_ingreso)) : '—'} />
        <Cifra
          etiqueta="Aves"
          valor={lote ? vivas.toLocaleString('es-CO') : '—'}
          detalle={lote && indicador?.mortalidadAcumuladaPct != null ? `${decimal.format(indicador.mortalidadAcumuladaPct)} % de mortalidad` : undefined}
        />
        <Cifra etiqueta="Temperatura" valor={temperatura?.valor != null ? `${decimal.format(temperatura.valor)} ${temperatura.unidad}` : '—'} />
        <Cifra etiqueta="Humedad" valor={humedad?.valor != null ? `${decimal.format(humedad.valor)} ${humedad.unidad}` : '—'} />
      </dl>

      <section className={`gp-paso gp-paso--${paso.tono}`} aria-labelledby="gp-paso-titulo">
        <span className="gp-paso-icono" aria-hidden="true">
          {paso.tono === 'ok' ? <IcCheck size={18} /> : <IcAlert size={18} />}
        </span>
        <div className="gp-paso-texto">
          <span className="gp-paso-rotulo">Siguiente paso</span>
          <strong id="gp-paso-titulo">{paso.titulo}</strong>
          <span>{paso.detalle}</span>
        </div>
        {paso.accion && (
          <button type="button" className="adm-btn adm-btn--primario" onClick={() => onDestino(paso.destino)}>
            {paso.accion} <IcArrowRight size={14} aria-hidden="true" />
          </button>
        )}
      </section>

      {lote && (
        <section className="gp-bloque" aria-labelledby="gp-curva-titulo">
          <div className="gp-bloque-cabecera">
            <h3 id="gp-curva-titulo">Crecimiento del lote</h3>
            <button type="button" className="gp-enlace" onClick={() => onNavegar(`/guia-crecimiento?lote=${lote.id}`)}>
              Ver guía completa <IcArrowRight size={13} aria-hidden="true" />
            </button>
          </div>
          <CurvaMini lote={lote} revision={revision} onNavegar={onNavegar} />
        </section>
      )}

      <nav className="gp-atajos" aria-label="Atajos del galpón">
        {lote && (
          <button type="button" onClick={() => onNavegar(`/guia-crecimiento?lote=${lote.id}`)}>
            <IcScale size={16} aria-hidden="true" /> Guía de peso
          </button>
        )}
        <button type="button" onClick={() => onNavegar('/bitacora')}>
          <IcDoc size={16} aria-hidden="true" /> Bitácora
        </button>
        <button type="button" onClick={() => onNavegar('/monitoreo')}>
          <IcEye size={16} aria-hidden="true" /> Monitoreo
        </button>
        <button type="button" onClick={() => onNavegar('/alertas')}>
          <IcAlert size={16} aria-hidden="true" /> Alertas
        </button>
      </nav>
    </div>
  )
}

export default ResumenPestana
