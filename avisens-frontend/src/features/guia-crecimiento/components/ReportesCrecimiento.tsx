import { useState } from 'react'
import { toast } from 'sonner'
import { listarConsumosDiarios } from '@features/consumos-diarios/api/consumosDiarios'
import type { CurvaCrecimiento } from '@features/predicciones/api/predicciones'
import type { Lote } from '@features/lotes/api/lotes'
import { descargarBlob, nombreConFecha } from '@shared/utils/descargas'
import { mensajeDeError } from '@shared/utils/errores'
import { cargarLogoAvisens, crearLibroXlsx, TIPO_XLSX } from '@shared/utils/xlsx'
import type { PlanAlimentoGuia, IndicadorLote } from '../api/guiaCrecimiento'
import { hojasAlimentacionExcel, hojasCrecimientoExcel, hojasEjecutivoExcel } from '../model/reportesExcel'

type Props = {
  lote: Lote
  indicadores: IndicadorLote[]
  curva: CurvaCrecimiento | null
  alimento: PlanAlimentoGuia | null
  cargandoAlimento: boolean
  onAbrirComparativa?: () => void
}

function nombreSeguro(codigo: string): string {
  return codigo.trim().replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '') || 'lote'
}

function descargarExcel(codigo: string, sufijo: string, libro: Uint8Array) {
  descargarBlob(
    new Blob([libro], { type: TIPO_XLSX }),
    nombreConFecha(`${sufijo}-${nombreSeguro(codigo)}`, 'xlsx'),
  )
}

function ReportesCrecimiento({
  lote,
  indicadores,
  curva,
  alimento,
  cargandoAlimento,
  onAbrirComparativa,
}: Props) {
  const [exportando, setExportando] = useState(false)
  const crecimientoDisponible = indicadores.some((dato) => dato.estado_calculo === 'calculado' && dato.dia_vida !== null)
    || (curva?.serie.length ?? 0) > 0

  async function exportarEjecutivo() {
    setExportando(true)
    try {
      const logo = await cargarLogoAvisens()
      const libro = crearLibroXlsx(hojasEjecutivoExcel(lote, indicadores, curva, alimento, logo))
      descargarExcel(lote.codigo, 'ejecutivo', libro)
      toast.success('Reporte ejecutivo descargado')
    } catch (fallo) {
      toast.error(mensajeDeError(fallo, 'No se pudo descargar el reporte ejecutivo.'))
    } finally {
      setExportando(false)
    }
  }

  async function exportarCrecimiento() {
    if (!crecimientoDisponible) {
      toast.info('No hay datos de crecimiento para este lote.')
      return
    }
    setExportando(true)
    try {
      const logo = await cargarLogoAvisens()
      const libro = crearLibroXlsx(hojasCrecimientoExcel(lote, indicadores, curva, logo))
      descargarExcel(lote.codigo, 'crecimiento', libro)
      toast.success('Reporte de crecimiento descargado')
    } catch (fallo) {
      toast.error(mensajeDeError(fallo, 'No se pudo descargar el reporte de crecimiento.'))
    } finally {
      setExportando(false)
    }
  }

  async function exportarAlimentacion() {
    setExportando(true)
    try {
      const [registros, logo] = await Promise.all([
        listarConsumosDiarios(),
        cargarLogoAvisens(),
      ])
      const consumosLote = registros.filter((r) => r.lote_id === lote.id)
      const planVigente = alimento !== null && alimento.efectiva && !alimento.desactualizado
        && !alimento.desglose.no_disponible && alimento.desglose.renglones.length > 0
      if (consumosLote.length === 0 && !planVigente) {
        toast.info('No hay consumos registrados ni una estimación vigente del plan para este lote.')
        return
      }
      const libro = crearLibroXlsx(hojasAlimentacionExcel(lote, registros, alimento, logo))
      descargarExcel(lote.codigo, 'alimentacion', libro)
      toast.success('Reporte de alimentación descargado')
    } catch (fallo) {
      toast.error(mensajeDeError(fallo, 'No se pudo descargar el reporte de alimentación.'))
    } finally {
      setExportando(false)
    }
  }

  return (
    <section className="gdc-reportes" aria-label="Reportes del lote">
      <p className="gdc-reportes-nota">
        Descarga informes técnicos en Excel (.xlsx) con los datos del lote. Evalúa el rendimiento zootécnico y compara ciclos históricos.
      </p>
      <div className="gdc-reportes-acciones">
        <button
          type="button"
          className="adm-btn adm-btn--primario"
          onClick={() => void exportarEjecutivo()}
          disabled={exportando || cargandoAlimento}
        >
          Excel Ejecutivo
        </button>
        {onAbrirComparativa && (
          <button
            type="button"
            className="adm-btn adm-btn--secundario"
            onClick={onAbrirComparativa}
          >
            Comparar con otro lote
          </button>
        )}
        <button
          type="button"
          className="adm-btn adm-btn--secundario"
          onClick={() => void exportarCrecimiento()}
          disabled={!crecimientoDisponible || exportando}
        >
          Excel Crecimiento
        </button>
        <button
          type="button"
          className="adm-btn adm-btn--secundario"
          onClick={() => void exportarAlimentacion()}
          disabled={exportando || cargandoAlimento}
        >
          {exportando ? 'Preparando reporte…' : 'Excel Alimentación'}
        </button>
      </div>
    </section>
  )
}

export default ReportesCrecimiento
