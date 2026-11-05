import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getRol } from '@shared/api'
import { permisosDePlan, ROL_ADMIN, ROL_PROPIETARIO } from '@shared/auth/permisos'
import { formatearFechaCalendario } from '@shared/utils/fechas'
import '@shared/ui/admin/AdminKit.css'
import { useGuiaCrecimiento } from './hooks/useGuiaCrecimiento'
import { useProyeccionLote } from './hooks/useProyeccionLote'
import { useAnomaliasLote } from './hooks/useAnomaliasLote'
import SeleccionarLoteGuia from './components/SeleccionarLoteGuia'
import PanelCrecimiento from './components/PanelCrecimiento'
import AlertasTempranas from './components/AlertasTempranas'
import LecturaDelDia from './components/LecturaDelDia'
import MetaDelLote from './components/MetaDelLote'
import ReglaCiclo from './components/ReglaCiclo'
import ProyeccionFaena from './components/ProyeccionFaena'
import ReportesCrecimiento from './components/ReportesCrecimiento'
import { fraseDeCrecimiento, severidadPorDia } from './model/reglaCiclo'
import { formatearPeso } from './model/proyeccion'
import './GuiaCrecimientoPage.css'
import './GuiaCiclo.css'

const MIN_PESO_OBJETIVO_G = 1000
const MAX_PESO_OBJETIVO_G = 4200

function GuiaCrecimientoPage() {
  const [parametros] = useSearchParams()
  const valorLote = parametros.get('lote')
  const loteId = valorLote && /^[1-9]\d*$/.test(valorLote) && Number.isSafeInteger(Number(valorLote))
    ? Number(valorLote) : null
  const guia = useGuiaCrecimiento(loteId)
  const permisos = permisosDePlan(getRol())
  const puedeComparar = getRol() === ROL_ADMIN || getRol() === ROL_PROPIETARIO
  const lote = guia.loteSeleccionado
  const rutaPadre = lote ? `/lotes?galpon=${lote.galpon.id}` : '/lotes'
  const revisionPlan = guia.plan ? `${guia.plan.id}-${guia.plan.version}-${guia.plan.desactualizado}` : 'sin-plan'
  const proyeccion = useProyeccionLote(loteId, lote?.estado === 'activo', revisionPlan)
  const anomalias = useAnomaliasLote(loteId, lote?.estado === 'activo')
  const curva = proyeccion.curva
  const diaHoy = curva?.dia_actual ?? guia.diaActual ?? 1
  const primerDia = curva?.serie[0]?.dia ?? 1
  const diaFinal = Math.max(primerDia + 1, curva?.dia_final ?? guia.plan?.resultado.dia_objetivo ?? 42)
  const [diaElegido, setDiaElegido] = useState<number | null>(null)
  useEffect(() => { setDiaElegido(null) }, [loteId, curva?.dia_actual])
  const diaSeleccionado = Math.min(diaFinal, Math.max(primerDia, diaElegido ?? Math.min(diaHoy, diaFinal)))

  async function guardarPesoObjetivo(pesoObjetivoG: number) {
    if (guia.cargandoDetalle) throw new Error('Espera a que termine de cargar la curva del lote.')
    if (pesoObjetivoG < MIN_PESO_OBJETIVO_G) {
      throw new Error('El peso objetivo mínimo es de 1 kg (aproximadamente 2,20 lb).')
    }
    if (pesoObjetivoG > MAX_PESO_OBJETIVO_G) {
      throw new Error('El peso objetivo máximo es de 4,20 kg (aproximadamente 9,25 lb), correspondiente a un ciclo de hasta 50 días.')
    }
    await guia.crearPlan(pesoObjetivoG)
  }

  async function ejecutarAccion(accion: () => Promise<unknown>) {
    try { await accion() } catch {
      // El hook muestra el error de la operación en su sección correspondiente.
    }
  }

  if (loteId === null) {
    return <SeleccionarLoteGuia />
  }
  if (guia.cargandoLote) {
    return (
      <div className="page-container adm-page guia-page">
        <header className="guia-resumen-lote">
          <p className="adm-vacio" role="status">Cargando lote…</p>
        </header>
      </div>
    )
  }
  if (lote === null || lote.estado !== 'activo') {
    return (
      <div className="page-container adm-page guia-page">
        <header className="guia-resumen-lote">
          <div className="guia-cabecera-fila-superior">
            <div>
              <span className="guia-lote-badge">Guía de crecimiento</span>
              <h1 className="guia-lote-titulo">{lote ? lote.codigo : 'Lote no encontrado'}</h1>
              <p className="guia-lote-ubicacion">
                {lote ? `${lote.galpon.nombre} · ${lote.galpon.granja.nombre}` : 'El lote solicitado no está disponible.'}
              </p>
            </div>
            <div className="guia-cabecera-acciones">
              <Link className="adm-btn adm-btn--secundario" to={rutaPadre}>Volver a lotes</Link>
            </div>
          </div>
        </header>
        {guia.error ? (
          <div className="adm-alerta" role="alert"><span>{guia.error}</span><button type="button" onClick={guia.recargar}>Reintentar</button></div>
        ) : (
          <p className="adm-aviso">La guía de crecimiento está disponible para lotes activos.</p>
        )}
      </div>
    )
  }

  const referencia = curva?.referencias.genetica?.linea ?? null
  const diasConPesaje = curva?.serie.filter((punto) => punto.real_g !== null).map((punto) => punto.dia) ?? []
  const alertasDelCiclo = anomalias.datos?.anomalias ?? []
  const alertasEnRegla = [...severidadPorDia(alertasDelCiclo)].map(([dia, severidad]) => ({ dia, severidad }))
  const salida = guia.plan?.resultado.fecha_salida_calculada ?? null
  const pesoMeta = guia.plan ? guia.plan.peso_objetivo_g : curva?.peso_objetivo_g ?? null
  const detalleSalida = [
    salida ? formatearFechaCalendario(salida) : null,
    pesoMeta ? formatearPeso(pesoMeta) : null,
  ].filter(Boolean).join(' · ') || 'Sin meta definida'

  return (
    <div className="page-container adm-page guia-page gdc">
      {guia.error && <div className="adm-alerta" role="alert"><span>{guia.error}</span><button type="button" onClick={guia.recargar} disabled={guia.guardando}>Reintentar</button></div>}

      <header className="gdc-cabecera" aria-label="Información del lote">
        <div className="gdc-cabecera-texto">
          <nav className="adm-migas guia-migas" aria-label="Ruta de navegación">
            <Link className="adm-miga" to={rutaPadre}>Lotes</Link>
            <span className="adm-miga-sep" aria-hidden="true">›</span>
            <span className="adm-miga adm-miga--actual" aria-current="page">{lote.codigo}</span>
          </nav>
          <h1 className="gdc-titulo">Guía de crecimiento</h1>
          <p className="gdc-contexto">
            {lote.codigo} · {lote.galpon.nombre} · {lote.galpon.granja.nombre}
            {lote.linea_genetica ? ` · Línea ${lote.linea_genetica.nombre}` : ''}
          </p>
          <p className="gdc-contexto gdc-contexto--datos">
            {lote.cantidad_inicial.toLocaleString('es-CO')} aves · encasetado el {formatearFechaCalendario(lote.fecha_ingreso)}
          </p>
        </div>
        <div className="gdc-cabecera-acciones">
          <Link className="adm-btn adm-btn--primario" to={`/bitacora?lote=${lote.id}&vista=peso`}>
            + Registrar pesaje
          </Link>
          <Link className="adm-btn adm-btn--secundario" to={rutaPadre}>
            Volver a lotes
          </Link>
        </div>
      </header>

      <section className="gdc-ciclo" aria-labelledby="gdc-ciclo-titulo">
        <div className="gdc-ciclo-cabecera">
          <h2 id="gdc-ciclo-titulo">
            Día {diaHoy} <span>de {diaFinal}</span>
          </h2>
          <p className="gdc-ciclo-frase" aria-live="polite">{fraseDeCrecimiento(curva)}</p>
        </div>
        <ReglaCiclo
          primerDia={primerDia}
          diaFinal={diaFinal}
          diaActual={diaHoy}
          diaSeleccionado={diaSeleccionado}
          diasConPesaje={diasConPesaje}
          alertas={alertasEnRegla}
          etiquetaSalida={`Salida · día ${diaFinal}`}
          detalleSalida={detalleSalida}
          onDiaChange={setDiaElegido}
        />
        <AlertasTempranas
          datos={anomalias.datos}
          error={anomalias.error}
          cargando={anomalias.cargando}
          diaSeleccionado={diaSeleccionado}
          onReintentar={anomalias.recargar}
          onSeleccionarDia={setDiaElegido}
        />
      </section>

      <div className="gdc-cuerpo">
        <PanelCrecimiento
          loteId={lote.id}
          puedeComparar={puedeComparar}
          lote={lote}
          indicadores={guia.indicadores}
          curvaGenetica={guia.curva?.puntos ?? []}
          curva={curva}
          diaSeleccionado={diaSeleccionado}
          problema={proyeccion.problemaCurva}
          cargando={proyeccion.cargandoCurva}
          onReintentar={proyeccion.recargar}
        />
        <LecturaDelDia
          curva={curva}
          dia={diaSeleccionado}
          referencia={referencia}
          alertasDelDia={alertasDelCiclo.filter((alerta) => alerta.dia === diaSeleccionado)}
        />
      </div>

      <section className="gdc-cierre" aria-labelledby="gdc-cierre-titulo">
        <h2 id="gdc-cierre-titulo">Cierre del lote</h2>
        <div className="gdc-cierre-columnas">
          <MetaDelLote
            loteId={lote.id}
            plan={guia.plan}
            puedeRegistrar={permisos.registrar}
            cargando={guia.cargandoPlan}
            error={guia.errorPlan}
            ocupado={guia.guardando || guia.cargandoPlan || guia.cargandoDetalle}
            minLibras={MIN_PESO_OBJETIVO_G / 453.59237}
            onGuardar={guardarPesoObjetivo}
            onRecalcular={() => void ejecutarAccion(() => guia.recalcularPlan())}
            onReintentar={guia.recargar}
          />
          <ProyeccionFaena
            loteId={lote.id}
            curva={curva}
            plan={guia.plan}
            prediccion={proyeccion.prediccion}
            error={proyeccion.errorPrediccion}
            cargando={proyeccion.cargandoPrediccion}
          />
        </div>
        <ReportesCrecimiento
          lote={lote}
          indicadores={guia.indicadores}
          curva={curva}
          alimento={guia.alimento}
          cargandoAlimento={guia.cargandoAlimento}
        />
      </section>
    </div>
  )
}

export default GuiaCrecimientoPage
