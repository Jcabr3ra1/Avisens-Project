import { useState } from 'react'
import { toast } from 'sonner'
import { listarConsumosDiarios } from '@features/consumos-diarios/api/consumosDiarios'
import type { CurvaCrecimiento } from '@features/predicciones/api/predicciones'
import type { Lote } from '@features/lotes/api/lotes'
import { descargarBlob, nombreConFecha } from '@shared/utils/descargas'
import { diasDeVida } from '@shared/utils/fechas'
import { mensajeDeError } from '@shared/utils/errores'
import type { PlanAlimentoGuia, IndicadorLote } from '../api/guiaCrecimiento'
import { crearCsv, type ValorCsv } from '../model/reportes'

type Props = {
  lote: Lote
  indicadores: IndicadorLote[]
  curva: CurvaCrecimiento | null
  alimento: PlanAlimentoGuia | null
  cargandoAlimento: boolean
}

const ENCABEZADOS_CRECIMIENTO = [
  'Lote', 'Día de vida', 'Fecha del indicador', 'Fecha del pesaje',
  'Peso registrado (g)', 'Peso proyectado (g)', 'Rango mínimo (g)',
  'Rango máximo (g)', 'Curva estándar (g)', 'FCR registrado', 'Estado del indicador',
]

const ENCABEZADOS_ALIMENTO = [
  'Tipo de dato', 'Lote', 'Fecha', 'Día o período', 'Alimento',
  'Alimento total (kg)', 'Consumo por ave (g)', 'Agua (L)', 'Método de registro',
]

function nombreSeguro(codigo: string): string {
  return codigo.trim().replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '') || 'lote'
}

function descargar(codigo: string, sufijo: string, contenido: string) {
  descargarBlob(
    new Blob([contenido], { type: 'text/csv;charset=utf-8' }),
    nombreConFecha(`${sufijo}-${nombreSeguro(codigo)}`, 'csv'),
  )
}

function filasCrecimiento(lote: Lote, indicadores: IndicadorLote[], curva: CurvaCrecimiento | null): ValorCsv[][] {
  const validos = indicadores.filter((dato) => dato.estado_calculo === 'calculado' && dato.dia_vida !== null)
  const indicadorPorDia = new Map(validos.map((dato) => [dato.dia_vida!, dato]))
  const curvaPorDia = new Map(curva?.serie.map((punto) => [punto.dia, punto]) ?? [])
  const dias = [...new Set([...indicadorPorDia.keys(), ...curvaPorDia.keys()])].sort((a, b) => a - b)
  const proyeccionDisponible = (curva?.modelo.puntos_usados ?? 0) >= 3

  return dias.map((dia) => {
    const indicador = indicadorPorDia.get(dia)
    const punto = curvaPorDia.get(dia)
    const pesoRegistrado = indicador?.estado_peso === 'disponible' ? indicador.peso_promedio_g : null
    return [
      lote.codigo,
      dia,
      indicador?.fecha.slice(0, 10) ?? null,
      indicador?.estado_peso === 'disponible' ? indicador.pesaje_fecha_snapshot?.slice(0, 10) ?? null : null,
      pesoRegistrado,
      proyeccionDisponible ? punto?.proyectado_g ?? null : null,
      proyeccionDisponible ? punto?.min_g ?? null : null,
      proyeccionDisponible ? punto?.max_g ?? null : null,
      punto?.estandar_g ?? null,
      indicador?.fcr ?? null,
      indicador?.estado_calculo ?? null,
    ]
  })
}

function filasAlimento(lote: Lote, registros: Awaited<ReturnType<typeof listarConsumosDiarios>>, alimento: PlanAlimentoGuia | null): ValorCsv[][] {
  const filas: ValorCsv[][] = registros
    .filter((registro) => registro.lote_id === lote.id)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)
    .map((registro) => [
      'Consumo registrado',
      lote.codigo,
      registro.fecha.slice(0, 10),
      diasDeVida(lote.fecha_ingreso, new Date(`${registro.fecha.slice(0, 10)}T12:00:00`)),
      registro.tipo_alimento?.nombre ?? null,
      registro.alimento_kg,
      null,
      registro.agua_litros,
      registro.metodo_registro,
    ])

  const planVigente = alimento !== null && alimento.efectiva && !alimento.desactualizado
    && !alimento.desglose.no_disponible
  if (planVigente && alimento) {
    for (const renglon of alimento.desglose.renglones) {
      filas.push([
        'Estimación del plan',
        lote.codigo,
        null,
        `Día ${renglon.dia_inicio}–${renglon.dia_fin}`,
        renglon.tipo_alimento_nombre_snapshot ?? null,
        renglon.consumo_total_kg,
        renglon.consumo_por_ave_g,
        null,
        `Plan versión ${alimento.version}`,
      ])
    }
  }
  return filas
}

function ReportesCrecimiento({ lote, indicadores, curva, alimento, cargandoAlimento }: Props) {
  const [exportando, setExportando] = useState(false)
  const crecimientoDisponible = indicadores.some((dato) => dato.estado_calculo === 'calculado' && dato.dia_vida !== null)
    || (curva?.serie.length ?? 0) > 0

  function exportarCrecimiento() {
    const filas = filasCrecimiento(lote, indicadores, curva)
    if (filas.length === 0) {
      toast.info('No hay datos de crecimiento para este lote.')
      return
    }
    descargar(lote.codigo, 'crecimiento', crearCsv(ENCABEZADOS_CRECIMIENTO, filas))
    toast.success('Reporte de crecimiento descargado')
  }

  async function exportarAlimentacion() {
    setExportando(true)
    try {
      const registros = await listarConsumosDiarios()
      const filas = filasAlimento(lote, registros, alimento)
      if (filas.length === 0) {
        toast.info('No hay consumos registrados ni una estimación vigente del plan para este lote.')
        return
      }
      descargar(lote.codigo, 'alimentacion', crearCsv(ENCABEZADOS_ALIMENTO, filas))
      toast.success('Reporte de alimentación descargado')
    } catch (fallo) {
      toast.error(mensajeDeError(fallo, 'No se pudo descargar el reporte de alimentación.'))
    } finally {
      setExportando(false)
    }
  }

  return (
    <section className="guia-reportes" aria-labelledby="guia-reportes-titulo">
      <div>
        <p className="guia-lote-badge">Para guardar o compartir</p>
        <h2 id="guia-reportes-titulo">Tus reportes</h2>
        <p>Descarga un archivo CSV con los datos disponibles del lote.</p>
      </div>
      <div className="guia-reportes-acciones">
        <button type="button" className="adm-btn adm-btn--secundario" onClick={exportarCrecimiento} disabled={!crecimientoDisponible || exportando}>
          Descargar reporte de crecimiento
        </button>
        <button type="button" className="adm-btn adm-btn--secundario" onClick={() => void exportarAlimentacion()} disabled={exportando || cargandoAlimento}>
          {exportando ? 'Preparando reporte…' : 'Descargar reporte de alimentación'}
        </button>
      </div>
      <p className="guia-reportes-nota">El archivo de alimentación separa los consumos registrados de las estimaciones vigentes del plan. No incluye proyecciones desactualizadas.</p>
    </section>
  )
}

export default ReportesCrecimiento
