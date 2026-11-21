import { useMemo } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import type { Lote } from '@features/lotes/api/lotes'
import type { CurvaCrecimiento } from '@features/predicciones/api/predicciones'
import type { PlanAlimentoGuia, IndicadorLote } from '../api/guiaCrecimiento'
import { gramosALibras } from '@features/lotes/model/pesoObjetivo'
import './ReporteImprimible.css'

interface Props {
  lote: Lote
  indicadores: IndicadorLote[]
  curva: CurvaCrecimiento | null
  alimento: PlanAlimentoGuia | null
  onCerrar: () => void
}

export default function ModalReporteImprimible({
  lote,
  indicadores,
  curva,
  alimento,
  onCerrar,
}: Props) {
  // Cálculo de KPIs consolidados
  const datosCalculados = useMemo(() => {
    const validos = indicadores
      .filter((i) => i.estado_calculo === 'calculado' && i.dia_vida !== null)
      .sort((a, b) => (a.dia_vida ?? 0) - (b.dia_vida ?? 0))

    const ultimoIndicador = validos.length > 0 ? validos[validos.length - 1] : null

    // Aves
    const avesIniciales = lote.cantidad_inicial
    const avesFinales = lote.cantidad_aves_vendidas ?? avesIniciales
    const duracionDias = curva?.dia_actual ?? validos.length

    // Peso
    const pesoFinalG =
      lote.peso_promedio_final_g ??
      ultimoIndicador?.peso_promedio_g ??
      curva?.resumen.ultimo_pesaje.peso_g ??
      0

    // Carne producida (kg)
    const carneTotalKg = Math.round((avesFinales * pesoFinalG) / 1000)

    // Alimento acumulado
    const alimentoTotalKg =
      alimento?.resultado.consumo_total_kg ??
      (ultimoIndicador?.consumo_acumulado_g
        ? Math.round((ultimoIndicador.consumo_acumulado_g * avesFinales) / 1000)
        : 0)

    // FCR
    const fcrFinal = lote.fcr_final ?? ultimoIndicador?.fcr ?? (carneTotalKg > 0 ? (alimentoTotalKg / carneTotalKg) : null)

    // Mortalidad acumulada %
    const mortalidadPct =
      lote.mortalidad_acumulada_final_pct ??
      (avesIniciales > 0 ? (((avesIniciales - avesFinales) / avesIniciales) * 100) : 0)

    // Financiero preliminar
    // Precio promedio estándar alimento comercial ~ $2.600 COP / kg
    const costoEstimadoAlimentoCop = alimentoTotalKg * 2600
    // Valor venta carne (real o estimado a $6.200 COP / kg pie de granja)
    const precioKgVentaCop = lote.precio_venta_kg_cop ?? 6200
    const ingresoVentaCop = lote.valor_venta_total_cop ?? (carneTotalKg * precioKgVentaCop)
    const margenPreliminarCop = ingresoVentaCop - costoEstimadoAlimentoCop

    return {
      validos,
      avesIniciales,
      avesFinales,
      duracionDias,
      pesoFinalG,
      carneTotalKg,
      alimentoTotalKg,
      fcrFinal,
      mortalidadPct: Math.round(mortalidadPct * 100) / 100,
      costoEstimadoAlimentoCop,
      ingresoVentaCop,
      margenPreliminarCop,
    }
  }, [lote, indicadores, curva, alimento])

  function imprimir() {
    window.print()
  }

  return (
    <Modal
      titulo="Reporte ejecutivo de crecimiento y liquidación"
      subtitulo="Formato para exportar en PDF o imprimir con indicadores zootécnicos y financieros (HU-29)."
      onCerrar={onCerrar}
      ancho="ancho"
      acciones={
        <>
          <button
            type="button"
            className="modal-btn modal-btn--secondary"
            onClick={onCerrar}
          >
            Cerrar
          </button>
          <button
            type="button"
            className="modal-btn modal-btn--primary"
            onClick={imprimir}
          >
            Imprimir / Guardar en PDF
          </button>
        </>
      }
    >
      <div className="reporte-imprimible-wrap rep-impresion">
        <div className="rep-documento">
          {/* Cabecera del informe */}
          <header className="rep-cabecera">
            <div className="rep-logo-titulo">
              <h2>AVISENS · INFORME DE DESEMPEÑO DEL LOTE</h2>
              <p>
                Granja: <strong>{lote.galpon.granja.nombre}</strong> · Galpón: <strong>{lote.galpon.nombre}</strong>
              </p>
              <p>
                Línea genética: <strong>{lote.linea_genetica?.nombre ?? 'Estándar'}</strong> · Sexo:{' '}
                <strong>{lote.sexo ?? 'Mixto'}</strong>
              </p>
            </div>
            <div className="rep-meta-lote">
              <span className="rep-codigo-badge">{lote.codigo}</span>
              <div>Fecha informe: {new Date().toLocaleDateString('es-CO')}</div>
              <div>Ingreso: {lote.fecha_ingreso.slice(0, 10)}</div>
              <div>Estado: <strong>{lote.estado.toUpperCase()}</strong></div>
            </div>
          </header>

          {/* Resumen Zootécnico */}
          <section>
            <h3 className="rep-seccion-titulo">1. Indicadores Zootécnicos Clave</h3>
            <div className="rep-resumen-grid">
              <div className="rep-tarjeta-kpi">
                <dt>Aves Encasetadas / Vendidas</dt>
                <dd>
                  {datosCalculados.avesIniciales.toLocaleString()} / {datosCalculados.avesFinales.toLocaleString()}
                </dd>
              </div>
              <div className="rep-tarjeta-kpi">
                <dt>Peso Promedio Alcanzado</dt>
                <dd>
                  {datosCalculados.pesoFinalG.toLocaleString()} g{' '}
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    ({gramosALibras(datosCalculados.pesoFinalG).toFixed(2)} lb)
                  </span>
                </dd>
              </div>
              <div className="rep-tarjeta-kpi">
                <dt>Conversión Alimenticia (FCR)</dt>
                <dd>{datosCalculados.fcrFinal ? datosCalculados.fcrFinal.toFixed(2) : '—'}</dd>
              </div>
              <div className="rep-tarjeta-kpi">
                <dt>Mortalidad Acumulada</dt>
                <dd>{datosCalculados.mortalidadPct}%</dd>
              </div>
            </div>
          </section>

          {/* Resumen Financiero Preliminar */}
          <section className="rep-financiero-caja">
            <h3 className="rep-seccion-titulo" style={{ borderColor: '#86efac' }}>
              2. Balance Financiero Preliminar (Carne vs. Alimento)
            </h3>
            <div className="rep-financiero-grid">
              <div>
                <dt style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>Carne Total Producida</dt>
                <dd style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.25rem 0', color: '#14532d' }}>
                  {datosCalculados.carneTotalKg.toLocaleString()} kg
                </dd>
                <small style={{ color: '#166534' }}>
                  Ingreso estimado / real: $ {datosCalculados.ingresoVentaCop.toLocaleString('es-CO')} COP
                </small>
              </div>
              <div>
                <dt style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>Alimento Total Consumido</dt>
                <dd style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.25rem 0', color: '#14532d' }}>
                  {datosCalculados.alimentoTotalKg.toLocaleString()} kg
                </dd>
                <small style={{ color: '#166534' }}>
                  Costo estimado alimento: $ {datosCalculados.costoEstimadoAlimentoCop.toLocaleString('es-CO')} COP
                </small>
              </div>
              <div>
                <dt style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>Margen Bruto de Operación</dt>
                <dd style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.25rem 0', color: '#15803d' }}>
                  $ {datosCalculados.margenPreliminarCop.toLocaleString('es-CO')} COP
                </dd>
                <small style={{ color: '#166534' }}>Diferencia directa Venta Carne - Costo Alimento</small>
              </div>
            </div>
          </section>

          {/* Tabla de evolución semanal / diaria */}
          <section>
            <h3 className="rep-seccion-titulo">3. Historial de Crecimiento y Consumo</h3>
            <div className="rep-tabla-wrap">
              <table className="rep-tabla">
                <thead>
                  <tr>
                    <th>Día de vida</th>
                    <th>Fecha</th>
                    <th className="num">Peso Promedio (g)</th>
                    <th className="num">Peso (lb)</th>
                    <th className="num">Consumo Acum. (g/ave)</th>
                    <th className="num">FCR Registrado</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {datosCalculados.validos.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text3)' }}>
                        No hay puntos de pesaje registrados para este lote todavía.
                      </td>
                    </tr>
                  ) : (
                    datosCalculados.validos.map((ind) => (
                      <tr key={ind.id}>
                        <td><strong>Día {ind.dia_vida}</strong></td>
                        <td>{ind.fecha.slice(0, 10)}</td>
                        <td className="num">
                          {ind.peso_promedio_g ? `${ind.peso_promedio_g.toLocaleString()} g` : '—'}
                        </td>
                        <td className="num">
                          {ind.peso_promedio_g ? `${gramosALibras(ind.peso_promedio_g).toFixed(2)} lb` : '—'}
                        </td>
                        <td className="num">
                          {ind.consumo_acumulado_g ? `${ind.consumo_acumulado_g.toLocaleString()} g` : '—'}
                        </td>
                        <td className="num">{ind.fcr ? ind.fcr.toFixed(2) : '—'}</td>
                        <td>{ind.estado_peso ?? 'Registrado'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="rep-pie">
            <span>Avisens Cloud · Sistema de Monitoreo y Gestión Avícola</span>
            <span>Generado para el Propietario de la Granja · Página 1 de 1</span>
          </footer>
        </div>
      </div>
    </Modal>
  )
}
