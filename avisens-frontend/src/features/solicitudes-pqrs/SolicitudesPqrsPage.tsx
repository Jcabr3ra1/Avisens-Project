import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUsuario } from '@shared/api'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import { IcUsers } from '@shared/ui/icons/icons'
import FiltrosSolicitudesPqrs from './components/FiltrosSolicitudesPqrs'
import PanelSolicitudPqrs from './components/PanelSolicitudPqrs'
import ResumenSolicitudesPqrs from './components/ResumenSolicitudesPqrs'
import TablaSolicitudesPqrs from './components/TablaSolicitudesPqrs'
import { useSolicitudesPqrs } from './hooks/useSolicitudesPqrs'
import type { SolicitudPqrs } from './model/solicitudPqrs'
import '@shared/ui/admin/AdminKit.css'
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
  const [busqueda, setBusqueda] = useState('')
  const usuario = getUsuario()

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es-CO')
    if (!termino) return solicitudes

    return solicitudes.filter((solicitud) => [
      solicitud.prospecto.nombre,
      solicitud.prospecto.telefono,
      solicitud.prospecto.email,
      solicitud.categoria,
      solicitud.asunto,
    ].some((valor) => valor?.toLocaleLowerCase('es-CO').includes(termino)))
  }, [busqueda, solicitudes])

  return (
    <div className="page-container pqrs-page adm-page">
      <CabeceraAdmin
        eyebrow="Relación comercial"
        titulo="Solicitudes PQRS"
        subtitulo="Atiende peticiones, quejas, reclamos y sugerencias sin perder el contexto del cliente."
        acciones={(
          <Link className="adm-btn adm-btn--secundario" to="/crm">
            <IcUsers size={17} aria-hidden="true" />
            Volver a clientes
          </Link>
        )}
      />

      <ResumenSolicitudesPqrs solicitudes={solicitudes} />

      <FiltrosSolicitudesPqrs
        busqueda={busqueda}
        visibles={visibles.length}
        total={solicitudes.length}
        filtros={filtros}
        cargando={cargando}
        onBuscar={setBusqueda}
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
        <section className="pqrs-vacio adm-panel">
          <h2>No hay solicitudes para mostrar</h2>
          <p>Prueba cambiando los filtros o espera una nueva solicitud desde el chatbot.</p>
        </section>
      ) : visibles.length === 0 ? (
        <section className="pqrs-vacio adm-panel">
          <h2>No encontramos coincidencias</h2>
          <p>Prueba con otro nombre, teléfono, correo, asunto o categoría.</p>
        </section>
      ) : !error ? (
        <TablaSolicitudesPqrs solicitudes={visibles} onAbrir={setSeleccionada} />
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
