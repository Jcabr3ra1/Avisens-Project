import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HeroGranja from '@features/dashboard/components/HeroGranja'
import PanelAtencionGranja from '@features/dashboard/components/PanelAtencionGranja'
import ResumenGalpon from '@features/dashboard/components/ResumenGalpon'
import RiesgoCalorResumen from '@features/dashboard/components/RiesgoCalorResumen'
import EstadoLote from '@features/dashboard/components/EstadoLote'
import SinGalponesAsignados from '@shared/ui/Estados/SinGalponesAsignados'
import ModalRegistroOperario from './components/ModalRegistroOperario'
import ResumenLoteOperario from './components/ResumenLoteOperario'
import TarjetaJornada from './components/TarjetaJornada'
import { useInicioOperario } from './hooks/useInicioOperario'
import { useJornadaOperario } from './hooks/useJornadaOperario'
import { useResumenLoteOperario } from './hooks/useResumenLoteOperario'
import { rutaDeAtencion, rutaDeOperario } from './model/destinosOperario'
import type { JornadaOperario } from './model/jornadaOperario'
import '@shared/ui/admin/AdminKit.css'
import '@shared/ui/admin/CentroControl.css'
import '@features/dashboard/DashboardPage.css'
import '@features/dashboard/ResumenGranja.css'
import '@features/dashboard/ResumenRediseno.css'
import '@features/dashboard/ResumenAbajo.css'
import './OperarioPage.css'

type RegistroAbierto = { tipo: 'mortalidad' | 'consumo'; jornada: JornadaOperario } | null

function EsqueletoJornada() {
  return (
    <div className="page-container dashboard-page" aria-busy="true" aria-label="Cargando tu jornada">
      <div className="dashboard-skeleton dashboard-skeleton--header" />
      <div className="dashboard-skeleton dashboard-skeleton--state" />
      <div className="dashboard-skeleton-grid">
        <div className="dashboard-skeleton dashboard-skeleton--panel" />
        <div className="dashboard-skeleton dashboard-skeleton--panel" />
      </div>
    </div>
  )
}

// Inicio del operario con el mismo diseño que el resumen del propietario:
// el hero ilustrado de la granja, lo que pide atención y el galpón con sus
// sensores. Debajo del hero va lo propio de su rol: registrar mortalidad y
// consumo en cada galpón asignado. Los atajos que en el propietario llevan a
// /granjas aquí llevan a Alertas, Sensores o Bitácora (destinosOperario).
function OperarioPage() {
  const navigate = useNavigate()
  const inicio = useInicioOperario()
  const jornada = useJornadaOperario()
  const registrosLote = useResumenLoteOperario()
  const [registroAbierto, setRegistroAbierto] = useState<RegistroAbierto>(null)
  const { dashboard } = inicio
  const nombre = dashboard.usuario?.nombre?.trim().split(/\s+/)[0] || 'operario'
  const fecha = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

  function recargarTodo() {
    void dashboard.recargar()
    void jornada.recargar()
    void registrosLote.recargar()
  }

  if (dashboard.cargando && dashboard.granjas.length === 0) return <EsqueletoJornada />

  if (!dashboard.cargando && !jornada.cargando && dashboard.totalGalpones === 0 && jornada.jornadas.length === 0) {
    return (
      <div className="page-container dashboard-page operario-page">
        <SinGalponesAsignados queVerias="tu jornada: el estado de cada galpón, sus sensores y los botones para registrar mortalidad y consumo" />
      </div>
    )
  }

  function ejecutarAccion() {
    const accion = inicio.estado.accion
    if (!accion) return
    if (accion.tipo === 'atencion') {
      navigate(rutaDeAtencion(accion.item))
      return
    }
    navigate(dashboard.lote ? `/guia-crecimiento?lote=${dashboard.lote.id}` : '/guia-crecimiento')
  }

  return (
    <div className="page-container dashboard-page resumen-page operario-page">
      <HeroGranja
        nombre={nombre}
        fecha={fecha}
        granjas={dashboard.granjas}
        granjaId={dashboard.granjaId}
        estado={inicio.estado}
        kpis={inicio.kpis}
        diaLote={inicio.diaUnico}
        aves={inicio.avesAlojadas}
        nombreGalpon={dashboard.galpon?.nombre ?? null}
        clima={inicio.clima}
        sensores={inicio.sensoresEscena}
        cargando={dashboard.cargando || inicio.cargandoMonitoreo || jornada.cargando}
        onGranjaChange={dashboard.seleccionarGranja}
        onRecargar={recargarTodo}
        onAccion={ejecutarAccion}
        onNavegar={(destino) => navigate(rutaDeOperario(destino))}
      />

      {(dashboard.error || jornada.error) && (
        <div className="adm-alerta" role="alert">
          <span>{jornada.error || dashboard.error}</span>
          <button type="button" onClick={recargarTodo}>Reintentar</button>
        </div>
      )}

      {jornada.mensaje && <p className="operario-success" role="status">{jornada.mensaje}</p>}

      {inicio.atencion.length > 0 && (
        <PanelAtencionGranja
          items={inicio.atencion}
          cargando={false}
          sinSensores={inicio.sensoresGranja === 0}
        />
      )}

      <ResumenLoteOperario
        lote={dashboard.lote}
        nombreGalpon={dashboard.galpon?.nombre ?? null}
        galponId={dashboard.galponId}
        galpones={inicio.filas}
        onSeleccionarGalpon={dashboard.seleccionarGalpon}
        mortalidad={registrosLote.mortalidad}
        consumos={registrosLote.consumos}
        eventos={registrosLote.eventos}
        alertas={dashboard.alertasGranja}
        indicadores={inicio.indicadores}
        cargandoRegistros={registrosLote.cargando}
        cargandoIndicadores={inicio.cargandoLote}
        error={registrosLote.error}
      />

      {jornada.jornadas.length > 0 && (
        <section className="operario-registro" aria-labelledby="operario-registro-titulo">
          <header className="rsm-cabecera">
            <div>
              <h2 id="operario-registro-titulo" className="rsm-titulo rsm-titulo--grande">Registro de hoy</h2>
              <p className="rsm-subtitulo">Anota la mortalidad y el consumo de cada galpón a tu cargo.</p>
            </div>
          </header>
          <div className="operario-galpones">
            {jornada.jornadas.map((item) => (
              <TarjetaJornada
                key={item.galpon.id}
                jornada={item}
                onRegistrarMortalidad={() => setRegistroAbierto({ tipo: 'mortalidad', jornada: item })}
                onRegistrarConsumo={() => setRegistroAbierto({ tipo: 'consumo', jornada: item })}
                onVerAlertas={() => navigate('/alertas')}
                onVerCrecimiento={() => item.lote && navigate(`/guia-crecimiento?lote=${item.lote.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      <ResumenGalpon
        titulo={dashboard.galpon ? dashboard.galpon.nombre : 'Tu galpón'}
        detalle="Así está por dentro, ahora mismo"
        etiqueta={inicio.sensoresDelGalpon > 0
          ? `${inicio.reportando} de ${inicio.sensoresDelGalpon} sensores reportando`
          : null}
        sensores={inicio.sensoresEscena}
        aves={inicio.avesAlojadas}
        diaLote={inicio.diaUnico}
        clima={inicio.clima}
        galpones={inicio.filas}
        galponId={dashboard.galponId}
        onSeleccionar={dashboard.seleccionarGalpon}
        lote={(
          <>
            {dashboard.galponId !== null && <RiesgoCalorResumen galponId={dashboard.galponId} />}
            <EstadoLote
              lote={dashboard.lote}
              indicadores={inicio.indicadores}
              comparacion={inicio.comparacion}
              diaLote={dashboard.diaLote}
              cargando={inicio.cargandoLote}
            />
          </>
        )}
      />

      {registroAbierto && (
        <ModalRegistroOperario
          tipo={registroAbierto.tipo}
          jornada={registroAbierto.jornada}
          guardando={jornada.guardando}
          onCerrar={() => setRegistroAbierto(null)}
          onRegistrarMortalidad={async (loteId, registro) => {
            await jornada.registrarMortalidad(loteId, registro)
            void dashboard.recargar()
            void registrosLote.recargar()
          }}
          onRegistrarConsumo={async (loteId, registro) => {
            await jornada.registrarConsumo(loteId, registro)
            void dashboard.recargar()
            void registrosLote.recargar()
          }}
        />
      )}
    </div>
  )
}

export default OperarioPage
