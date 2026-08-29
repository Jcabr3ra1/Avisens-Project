import { useState } from 'react'
import { getUsuario } from '@shared/api'
import FiltrosSolicitudesPqrs from './components/FiltrosSolicitudesPqrs'
import PanelSolicitudPqrs from './components/PanelSolicitudPqrs'
import ResumenSolicitudesPqrs from './components/ResumenSolicitudesPqrs'
import TablaSolicitudesPqrs from './components/TablaSolicitudesPqrs'
import { useSolicitudesPqrs } from './hooks/useSolicitudesPqrs'
import type { SolicitudPqrs } from './model/solicitudPqrs'
import './SolicitudesPqrsPage.css'

function SolicitudesPqrsPage() {
  const {
    solicitudes,
    cargando,
    error,
    mensaje,
    filtros,
    aplicarFiltros,
    recargar,
    responder,
    eliminar,
  } = useSolicitudesPqrs()
  const [seleccionada, setSeleccionada] = useState<SolicitudPqrs | null>(null)
  const usuario = getUsuario()

  return (
    <div className="page-container pqrs-page">
      <ResumenSolicitudesPqrs solicitudes={solicitudes} />

      <FiltrosSolicitudesPqrs
        filtros={filtros}
        cargando={cargando}
        onCambiar={aplicarFiltros}
        onActualizar={() => void recargar()}
      />

      {mensaje && <p className="pqrs-aviso pqrs-aviso--exito" role="status">{mensaje}</p>}

      {error && (
        <p className="pqrs-aviso pqrs-aviso--error" role="alert">
          {error}
          <button type="button" onClick={() => void recargar()}>Reintentar</button>
        </p>
      )}

      {cargando ? (
        <p className="pqrs-aviso" role="status">Cargando solicitudes…</p>
      ) : !error && solicitudes.length === 0 ? (
        <section className="pqrs-vacio">
          <h2>No hay solicitudes para mostrar</h2>
          <p>Cuando un prospecto envíe una PQRS desde el chatbot, aparecerá aquí.</p>
        </section>
      ) : !error ? (
        <TablaSolicitudesPqrs solicitudes={solicitudes} onAbrir={setSeleccionada} />
      ) : null}

      {seleccionada && (
        <PanelSolicitudPqrs
          key={seleccionada.id}
          solicitud={seleccionada}
          responsableId={usuario?.id}
          onCerrar={() => setSeleccionada(null)}
          onResponder={responder}
          onEliminar={eliminar}
        />
      )}
    </div>
  )
}

export default SolicitudesPqrsPage
