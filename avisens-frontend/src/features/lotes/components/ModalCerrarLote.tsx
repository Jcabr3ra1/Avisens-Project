import { useState, useMemo, type FormEvent } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import { mensajeDeError } from '@shared/utils/errores'
import {
  cerrarLote,
  type Lote,
  type ResultadoCierreLote,
  type DiaFaltanteCierre,
} from '../api/lotes'
import { gramosALibras, librasAGramos } from '../model/pesoObjetivo'
import '@shared/ui/Modal/Modal.css'

interface Props {
  lote: Lote
  onCerrar: () => void
  onExito: () => void
}

function hoyFechaIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function ModalCerrarLote({ lote, onCerrar, onExito }: Props) {
  const [fechaSalida, setFechaSalida] = useState(hoyFechaIso())
  const [avesVendidas, setAvesVendidas] = useState<number | ''>(lote.cantidad_inicial)
  const [modoLibras, setModoLibras] = useState(true)
  const [pesoValor, setPesoValor] = useState<string>('5.5')
  const [valorVentaTotal, setValorVentaTotal] = useState<number | ''>('')
  const [confirmarOmisiones, setConfirmarOmisiones] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estado si el backend avisa de días faltantes
  const [avisoFaltantes, setAvisoFaltantes] = useState<{
    mensaje: string
    diasAlimento: DiaFaltanteCierre[]
    diasMortalidad: DiaFaltanteCierre[]
  } | null>(null)

  // Estado tras cierre exitoso para mostrar resumen
  const [resumenExito, setResumenExito] = useState<ResultadoCierreLote & { cerrado: true } | null>(null)

  // Peso en gramos normalizado
  const pesoFinalGramos = useMemo(() => {
    const val = parseFloat(pesoValor)
    if (isNaN(val) || val <= 0) return 0
    return modoLibras ? Math.round(librasAGramos(val)) : Math.round(val)
  }, [pesoValor, modoLibras])

  // Estimación de peso total en kilogramos
  const totalKilosVendidos = useMemo(() => {
    if (avesVendidas === '' || avesVendidas <= 0 || pesoFinalGramos <= 0) return 0
    return ((avesVendidas * pesoFinalGramos) / 1000)
  }, [avesVendidas, pesoFinalGramos])

  // Estimación de precio por kg
  const precioCalculadoPorKg = useMemo(() => {
    if (totalKilosVendidos <= 0 || valorVentaTotal === '' || valorVentaTotal <= 0) return 0
    return Math.round(valorVentaTotal / totalKilosVendidos)
  }, [totalKilosVendidos, valorVentaTotal])

  async function ejecutarCierre(forzar = false) {
    if (!fechaSalida) {
      setError('Selecciona la fecha real de salida.')
      return
    }
    if (
      avesVendidas === '' ||
      !Number.isInteger(avesVendidas) ||
      avesVendidas < 0 ||
      avesVendidas > lote.cantidad_inicial
    ) {
      setError(`Las aves vendidas deben ser un entero entre 0 y ${lote.cantidad_inicial.toLocaleString('es-CO')}.`)
      return
    }
    if (pesoFinalGramos <= 0 || pesoFinalGramos > 10_000) {
      setError('Ingresa un peso promedio final válido (hasta 10.000 g o 22 lb por ave).')
      return
    }
    if (
      valorVentaTotal !== '' &&
      (!Number.isFinite(valorVentaTotal) || valorVentaTotal < 0 || valorVentaTotal > 10_000_000_000)
    ) {
      setError('El ingreso total de venta debe estar entre $0 y $10.000.000.000.')
      return
    }

    setGuardando(true)
    setError(null)

    try {
      const respuesta = await cerrarLote(lote.id, {
        fecha_salida_real: fechaSalida,
        cantidad_aves_vendidas: Number(avesVendidas),
        peso_promedio_final_g: pesoFinalGramos,
        valor_venta_total_cop: valorVentaTotal !== '' ? Number(valorVentaTotal) : undefined,
        confirmar_cierre: forzar || confirmarOmisiones,
      })

      if (respuesta.cerrado) {
        setResumenExito(respuesta)
      } else if (respuesta.requiere_confirmacion) {
        setAvisoFaltantes({
          mensaje: respuesta.mensaje,
          diasAlimento: respuesta.dias_sin_alimento,
          diasMortalidad: respuesta.dias_sin_mortalidad,
        })
        setConfirmarOmisiones(true)
      }
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo cerrar el lote.'))
    } finally {
      setGuardando(false)
    }
  }

  function manejarSubmit(e: FormEvent) {
    e.preventDefault()
    void ejecutarCierre(confirmarOmisiones)
  }

  if (resumenExito) {
    const kpis = resumenExito.resumen_cierre
    return (
      <Modal
        titulo="Lote finalizado con éxito"
        subtitulo={`El lote ${lote.codigo} ha sido cerrado y el galpón queda liberado.`}
        onCerrar={() => {
          onExito()
          onCerrar()
        }}
        ancho="normal"
        acciones={
          <button
            type="button"
            className="modal-btn modal-btn--primary"
            onClick={() => {
              onExito()
              onCerrar()
            }}
          >
            Aceptar
          </button>
        }
      >
        <div className="adm-panel">
          <p className="adm-aviso" style={{ marginBottom: '1rem' }}>
            Se calcularon los indicadores definitivos y se registró el ingreso financiero por venta de aves.
          </p>
          <dl className="pdl-datos" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <dt>Duración del ciclo</dt>
              <dd><strong>{kpis.duracion_dias} días</strong></dd>
            </div>
            <div>
              <dt>Aves vendidas</dt>
              <dd><strong>{avesVendidas.toLocaleString('es-CO')} aves</strong></dd>
            </div>
            <div>
              <dt>Peso promedio final</dt>
              <dd>
                <strong>
                  {pesoFinalGramos.toLocaleString('es-CO')} g ({gramosALibras(pesoFinalGramos).toFixed(2)} lb)
                </strong>
              </dd>
            </div>
            <div>
              <dt>Total carne vendida</dt>
              <dd><strong>{kpis.peso_total_vendido_kg.toLocaleString('es-CO')} kg</strong></dd>
            </div>
            <div>
              <dt>Mortalidad final</dt>
              <dd><strong>{kpis.mortalidad_acumulada_final_pct}%</strong> ({kpis.muertes_totales} bajas)</dd>
            </div>
            <div>
              <dt>Conversión final (FCR)</dt>
              <dd><strong>{kpis.fcr_final ?? '—'}</strong></dd>
            </div>
            {valorVentaTotal !== '' && Number(valorVentaTotal) > 0 && (
              <>
                <div>
                  <dt>Ingreso total por venta</dt>
                  <dd><strong style={{ color: 'var(--color-exito, #16a34a)' }}>$ {Number(valorVentaTotal).toLocaleString('es-CO')} COP</strong></dd>
                </div>
                <div>
                  <dt>Precio por kilo</dt>
                  <dd><strong>$ {kpis.precio_venta_kg_cop?.toLocaleString('es-CO') ?? '—'} / kg</strong></dd>
                </div>
              </>
            )}
          </dl>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      titulo={`Cerrar lote · ${lote.codigo}`}
      subtitulo={`Galpón: ${lote.galpon.nombre} · ${lote.galpon.granja.nombre}`}
      onCerrar={onCerrar}
      ancho="normal"
      acciones={
        <>
          <button
            type="button"
            className="modal-btn modal-btn--secondary"
            onClick={onCerrar}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="modal-btn modal-btn--primary"
            onClick={() => void ejecutarCierre(confirmarOmisiones)}
            disabled={guardando}
          >
            {guardando ? 'Finalizando ciclo…' : avisoFaltantes ? 'Confirmar y cerrar de todos modos' : 'Cerrar y liquidar lote'}
          </button>
        </>
      }
    >
      <form onSubmit={manejarSubmit} className="modal-formulario">
        {error && (
          <div className="adm-alerta" role="alert" style={{ marginBottom: '1rem' }}>
            <span>{error}</span>
          </div>
        )}

        {avisoFaltantes && (
          <div className="adm-aviso" role="alert" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--color-aviso, #d97706)' }}>
            <strong>{avisoFaltantes.mensaje}</strong>
            {avisoFaltantes.diasAlimento.length > 0 && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                Días sin alimento:{' '}
                {avisoFaltantes.diasAlimento.map((d) => `Día ${d.dia} (${d.fecha})`).join(', ')}
              </p>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={confirmarOmisiones}
                onChange={(e) => setConfirmarOmisiones(e.target.checked)}
              />
              <span>Entiendo que faltan registros y deseo finalizar el lote con estos datos.</span>
            </label>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          <label className="modal-campo">
            <span>Fecha real de salida *</span>
            <input
              type="date"
              value={fechaSalida}
              max={hoyFechaIso()}
              onChange={(e) => setFechaSalida(e.target.value)}
              required
              disabled={guardando}
            />
          </label>

          <label className="modal-campo">
            <span>Aves vendidas *</span>
            <input
              type="number"
              min="0"
              max={lote.cantidad_inicial}
              value={avesVendidas}
              onChange={(e) => setAvesVendidas(e.target.value === '' ? '' : Number(e.target.value))}
              required
              disabled={guardando}
            />
            <small className="modal-ayuda">Inicial: {lote.cantidad_inicial.toLocaleString()} aves</small>
          </label>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span>Peso promedio final *</span>
            <button
              type="button"
              className="adm-btn adm-btn--secundario"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
              onClick={() => {
                if (modoLibras) {
                  setPesoValor(String(pesoFinalGramos))
                  setModoLibras(false)
                } else {
                  setPesoValor(gramosALibras(pesoFinalGramos).toFixed(2))
                  setModoLibras(true)
                }
              }}
            >
              Cambiar a {modoLibras ? 'Gramos (g)' : 'Libras (lb)'}
            </button>
          </div>

          <label className="modal-campo">
            <input
              type="number"
              step="any"
              min="0"
              value={pesoValor}
              onChange={(e) => setPesoValor(e.target.value)}
              placeholder={modoLibras ? 'Ej. 5.5' : 'Ej. 2500'}
              required
              disabled={guardando}
            />
            <small className="modal-ayuda">
              {modoLibras
                ? `Equivale a aprox. ${pesoFinalGramos.toLocaleString()} gramos`
                : `Equivale a aprox. ${gramosALibras(pesoFinalGramos).toFixed(2)} libras`}
            </small>
          </label>
        </div>

        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          <label className="modal-campo">
            <span>Ingreso total venta (COP)</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={valorVentaTotal}
              onChange={(e) => setValorVentaTotal(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Ej. 58000000"
              disabled={guardando}
            />
            <small className="modal-ayuda">Se registra como ingreso en "Venta de aves"</small>
          </label>

          <label className="modal-campo">
            <span>Precio estimado por kg</span>
            <input
              type="text"
              readOnly
              value={precioCalculadoPorKg > 0 ? `$ ${precioCalculadoPorKg.toLocaleString('es-CO')} / kg` : '—'}
              disabled
            />
            <small className="modal-ayuda">Calculado sobre {Math.round(totalKilosVendidos).toLocaleString()} kg vendidos</small>
          </label>
        </div>
      </form>
    </Modal>
  )
}
