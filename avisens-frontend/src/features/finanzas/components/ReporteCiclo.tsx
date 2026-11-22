import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { IcAlert, IcDoc } from '@shared/ui/icons/icons'
import { descargarBlob } from '@shared/utils/descargas'
import { mensajeDeError } from '@shared/utils/errores'
import { fechaDeHoy } from '@shared/utils/fechas'
import { crearLibroXlsx, TIPO_XLSX } from '@shared/utils/xlsx'
import type { Granja } from '@features/granjas/api/granjas'
import type { Lote } from '@features/lotes/api/lotes'
import {
  obtenerReporteFinanciero,
  type ReporteFinanciero,
} from '../api/reporte-financiero'
import {
  descripcionAlcance,
  errorDeFiltro,
  esAvisoInformativo,
  filtroDesdeFormulario,
  formatoCop,
  formatoPorcentaje,
  formularioReporteVacio,
  hojasDelReporte,
  nombreArchivoReporte,
  type FormularioReporte,
} from '../model/reporteFinanciero'
import ResumenFinancieroLote from './ResumenFinancieroLote'
import './ResumenFinancieroLote.css'
import './ReporteCiclo.css'

interface ReporteCicloProps {
  lotes: Lote[]
  granjas: Granja[]
}

function ReporteCiclo({ lotes, granjas }: ReporteCicloProps) {
  const [form, setForm] = useState<FormularioReporte>(() => formularioReporteVacio(fechaDeHoy()))
  const [reporte, setReporte] = useState<ReporteFinanciero | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [imprimiendo, setImprimiendo] = useState(false)

  const lotesOrdenados = useMemo(
    () => [...lotes].sort((a, b) => a.codigo.localeCompare(b.codigo, 'es')),
    [lotes],
  )

  function cambiar<K extends keyof FormularioReporte>(campo: K, valor: FormularioReporte[K]) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
    setError('')
  }

  async function generar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const problema = errorDeFiltro(form)
    if (problema) {
      setError(problema)
      return
    }
    setCargando(true)
    setError('')
    try {
      setReporte(await obtenerReporteFinanciero(filtroDesdeFormulario(form)))
    } catch (problemaAlCargar) {
      setReporte(null)
      setError(mensajeDeError(problemaAlCargar, 'No se pudo generar el reporte financiero.'))
    } finally {
      setCargando(false)
    }
  }

  const alcance = reporte?.alcance
  const granjaDelPeriodo = alcance?.tipo === 'periodo' ? alcance.granja_id : null
  const nombreGranja = granjaDelPeriodo !== null
    ? granjas.find((granja) => granja.id === granjaDelPeriodo)?.nombre
    : undefined

  function exportarExcel() {
    if (!reporte) return
    const libro = crearLibroXlsx(hojasDelReporte(reporte, nombreGranja))
    descargarBlob(new Blob([libro], { type: TIPO_XLSX }), `${nombreArchivoReporte(reporte)}.xlsx`)
    toast.success('Reporte exportado a Excel')
  }

  // El PDF sale del diálogo de impresión del navegador («Guardar como PDF»).
  // Imprimir la página tal cual no sirve: la barra lateral oculta sigue
  // ocupando espacio y el reporte salía corrido y cortado. Por eso se monta
  // una copia en un portal de <body> y la hoja de impresión oculta lo demás.
  function exportarPdf() {
    if (reporte) setImprimiendo(true)
  }

  useEffect(() => {
    if (!imprimiendo || !reporte) return
    const tituloAnterior = document.title
    // El título del documento es el nombre que el navegador propone al guardar.
    document.title = nombreArchivoReporte(reporte)
    const terminar = () => {
      document.title = tituloAnterior
      setImprimiendo(false)
    }
    window.addEventListener('afterprint', terminar, { once: true })
    window.print()
    return () => window.removeEventListener('afterprint', terminar)
  }, [imprimiendo, reporte])

  const avisosIncompletos = reporte?.avisos.filter((aviso) => !esAvisoInformativo(aviso.codigo)) ?? []
  const avisosInformativos = reporte?.avisos.filter((aviso) => esAvisoInformativo(aviso.codigo)) ?? []

  // Se arma una vez: va en la página y, al imprimir, también en un portal
  // colgado de <body>, fuera del layout del panel (ver ReporteCiclo.css).
  const cuerpo = reporte && (
    <section className="rc-imprimible" aria-label="Reporte financiero">
      <header className="rc-cabecera">
        <div>
          <p className="rc-eyebrow">Reporte financiero por ciclo</p>
          <h2 className="rc-titulo">{descripcionAlcance(reporte, nombreGranja)}</h2>
          <p className="rc-generado">Generado el {new Date(reporte.generado_en).toLocaleString('es-CO')}</p>
        </div>
        <div className="rc-acciones rc-no-imprimir">
          <button type="button" className="adm-btn adm-btn--secundario" onClick={exportarExcel}>
            <IcDoc size={16} aria-hidden="true" /> Exportar Excel
          </button>
          <button type="button" className="adm-btn adm-btn--secundario" onClick={exportarPdf}>
            <IcDoc size={16} aria-hidden="true" /> Exportar PDF
          </button>
        </div>
      </header>

      {avisosIncompletos.length > 0 && (
        <div className="adm-aviso rc-avisos" role="status">
          <IcAlert size={18} aria-hidden="true" />
          <div>
            <strong>Reporte parcial: hay datos incompletos</strong>
            <ul>{avisosIncompletos.map((aviso) => <li key={aviso.mensaje}>{aviso.mensaje}</li>)}</ul>
          </div>
        </div>
      )}
      {avisosInformativos.length > 0 && (
        <ul className="rc-notas">
          {avisosInformativos.map((aviso) => <li key={aviso.mensaje}>{aviso.mensaje}</li>)}
        </ul>
      )}

      <div className="rc-totales">
        <div className="fin-kpis" aria-label="Totales del reporte">
          <div className="fin-kpi fin-kpi--estatico">
            <span className="fin-kpi-etiqueta">Ingresos</span>
            <strong className="fin-kpi--ok">{formatoCop(reporte.totales.ingresos)}</strong>
            <small>Total en el alcance</small>
          </div>
          <div className="fin-kpi fin-kpi--estatico">
            <span className="fin-kpi-etiqueta">Egresos</span>
            <strong className="fin-kpi--peligro">{formatoCop(reporte.totales.egresos)}</strong>
            <small>Costos y gastos</small>
          </div>
          <div className="fin-kpi fin-kpi--estatico">
            <span className="fin-kpi-etiqueta">Balance</span>
            <strong className={reporte.totales.balance < 0 ? 'fin-kpi--peligro' : 'fin-kpi--ok'}>
              {formatoCop(reporte.totales.balance)}
            </strong>
            <small>{reporte.totales.balance < 0 ? 'Déficit del ciclo' : 'Resultado neto'}</small>
          </div>
          <div className="fin-kpi fin-kpi--estatico">
            <span className="fin-kpi-etiqueta">Margen neto</span>
            <strong className={reporte.totales.margen_neto_pct !== null && reporte.totales.margen_neto_pct < 0 ? 'fin-kpi--peligro' : undefined}>
              {formatoPorcentaje(reporte.totales.margen_neto_pct)}
            </strong>
            <small>Sobre ingresos</small>
          </div>
        </div>
      </div>

      {reporte.lotes.length > 0 && (
        <div className="rc-lotes">
          {reporte.lotes.map((lote) => (
            <ResumenFinancieroLote
              key={lote.lote_id}
              codigoLote={`${lote.codigo} · ${lote.granja}`}
              cantidadAves={lote.aves_vivas}
              diaVida={lote.dia_vida}
              estado={lote.estado}
              ingresos={lote.ingresos}
              egresos={lote.egresos}
              pesoActualKg={lote.peso_actual_kg}
              pesoObjetivoKg={lote.peso_objetivo_kg}
              margenNetoPct={lote.margen_neto_pct}
            />
          ))}
        </div>
      )}

      {reporte.gastos_generales.movimientos > 0 && (
        <p className="rc-generales">
          Incluye gastos generales de granja sin lote asignado: egresos {formatoCop(reporte.gastos_generales.egresos)}
          {reporte.gastos_generales.ingresos > 0 && `, ingresos ${formatoCop(reporte.gastos_generales.ingresos)}`}.
        </p>
      )}

      {reporte.lotes.some((lote) => lote.presupuesto_cop !== null) && (
        <section className="adm-panel rc-tabla-card" aria-label="Costos por lote">
          <h3 className="rc-subtitulo">Costos por lote</h3>
          <div className="fin-tabla-scroll">
            <table className="fin-tabla rc-tabla">
              <thead>
                <tr>
                  <th scope="col">Lote</th>
                  <th scope="col">Costo por ave</th>
                  <th scope="col">Presupuesto</th>
                  <th scope="col">Presupuesto usado</th>
                </tr>
              </thead>
              <tbody>
                {reporte.lotes.map((lote) => (
                  <tr key={lote.lote_id}>
                    <td>{lote.codigo}</td>
                    <td>{lote.costo_por_ave === null ? '—' : formatoCop(lote.costo_por_ave)}</td>
                    <td>{lote.presupuesto_cop === null ? 'Sin presupuesto' : formatoCop(lote.presupuesto_cop)}</td>
                    <td className={lote.presupuesto_usado_pct !== null && lote.presupuesto_usado_pct > 100 ? 'rc-excedido' : undefined}>
                      {formatoPorcentaje(lote.presupuesto_usado_pct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {reporte.por_categoria.length > 0 && (
        <section className="adm-panel rc-tabla-card" aria-label="Totales por categoría">
          <h3 className="rc-subtitulo">Totales por categoría</h3>
          <div className="fin-tabla-scroll">
            <table className="fin-tabla rc-tabla">
              <thead>
                <tr>
                  <th scope="col">Tipo</th>
                  <th scope="col">Categoría</th>
                  <th scope="col">Movimientos</th>
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {reporte.por_categoria.map((categoria) => (
                  <tr key={`${categoria.tipo}-${categoria.categoria_id}`}>
                    <td>
                      <span className={`fin-tipo-badge fin-tipo-badge--${categoria.tipo}`}>
                        {categoria.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td>{categoria.nombre}</td>
                    <td>{categoria.movimientos}</td>
                    <td className={`fin-monto fin-monto--${categoria.tipo}`}>{formatoCop(categoria.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </section>
  )

  return (
    <div className="rc">
      <form className="rc-filtros adm-panel rc-no-imprimir" onSubmit={(evento) => void generar(evento)} noValidate>
        <div className="fin-filtro-grupo" role="group" aria-label="Tipo de reporte">
          <button type="button" className="fin-filtro-btn" aria-pressed={form.modo === 'lote'} onClick={() => cambiar('modo', 'lote')}>
            Por lote
          </button>
          <button type="button" className="fin-filtro-btn" aria-pressed={form.modo === 'periodo'} onClick={() => cambiar('modo', 'periodo')}>
            Por periodo
          </button>
        </div>

        {form.modo === 'lote' ? (
          <label className="rc-campo">
            <span>Lote</span>
            <select className="fin-select" value={form.lote_id} onChange={(evento) => cambiar('lote_id', evento.target.value)}>
              <option value="">Elige un lote</option>
              {lotesOrdenados.map((lote) => (
                <option key={lote.id} value={lote.id}>
                  {lote.codigo} · {lote.galpon.granja.nombre}{lote.estado === 'activo' ? ' (en curso)' : ''}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <label className="rc-campo">
              <span>Desde</span>
              <input type="date" className="fin-select" value={form.fecha_desde} max={form.fecha_hasta || undefined} onChange={(evento) => cambiar('fecha_desde', evento.target.value)} />
            </label>
            <label className="rc-campo">
              <span>Hasta</span>
              <input type="date" className="fin-select" value={form.fecha_hasta} min={form.fecha_desde || undefined} onChange={(evento) => cambiar('fecha_hasta', evento.target.value)} />
            </label>
            {granjas.length > 1 && (
              <label className="rc-campo">
                <span>Granja</span>
                <select className="fin-select" value={form.granja_id} onChange={(evento) => cambiar('granja_id', evento.target.value)}>
                  <option value="">Todas las granjas</option>
                  {granjas.map((granja) => <option key={granja.id} value={granja.id}>{granja.nombre}</option>)}
                </select>
              </label>
            )}
          </>
        )}

        <button type="submit" className="adm-btn adm-btn--primario rc-generar" disabled={cargando}>
          {cargando ? 'Generando…' : 'Generar reporte'}
        </button>
        {error && <p className="rc-error" role="alert">{error}</p>}
      </form>

      {!reporte && !cargando && !error && (
        <div className="fin-vacio adm-panel rc-no-imprimir">
          <h2>Reporte financiero por ciclo</h2>
          <p>Elige un lote para ver su ciclo completo, o un periodo para consolidar varios lotes. Luego puedes exportarlo a PDF o Excel.</p>
        </div>
      )}

      {cuerpo}
      {imprimiendo && cuerpo && createPortal(
        <div className="rc-impresion"><div className="adm-page">{cuerpo}</div></div>,
        document.body,
      )}
    </div>
  )
}

export default ReporteCiclo
