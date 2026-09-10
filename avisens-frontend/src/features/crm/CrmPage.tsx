import { useState } from 'react'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import { useProspectos } from './hooks/useProspectos'
import { useFiltroProspectos } from './hooks/useFiltroProspectos'
import { useResumenProspectos } from './hooks/useResumenProspectos'
import ResumenCrm from './components/ResumenCrm'
import BarraHerramientas from './components/BarraHerramientas'
import TablaProspectos from './components/TablaProspectos'
import PanelDetalle from './components/PanelDetalle'
import '@shared/ui/admin/AdminKit.css'
import './CrmPage.css'

function CrmPage() {
  const {
    prospectos, asesores, cargando, asignandoId, exportando, error,
    recargar, asignar, exportar,
  } = useProspectos()
  const {
    filtro,
    setFiltro,
    filtroCanal,
    setFiltroCanal,
    busqueda,
    setBusqueda,
    visibles,
  } =
    useFiltroProspectos(prospectos)
  const resumen = useResumenProspectos(prospectos)
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null)
  // Se busca en la lista en vez de guardar una copia: al asignar un asesor,
  // el panel abierto tiene que reflejar el cambio y no la foto de antes.
  const seleccionado = prospectos.find((prospecto) => prospecto.id === seleccionadoId) ?? null

  const sinProspectos = !cargando && !error && prospectos.length === 0

  return (
    <div className="page-container crm-page adm-page">
      <CabeceraAdmin
        eyebrow="Relación comercial"
        titulo="Clientes y PQRS"
        subtitulo="Prioriza prospectos, acompaña oportunidades y atiende solicitudes desde un solo flujo."
      />

      <ResumenCrm resumen={resumen} />

      {cargando && <p className="crm-aviso" role="status">Cargando prospectos…</p>}

      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void recargar()}>
            Reintentar
          </button>
        </div>
      )}

      {sinProspectos && (
        <p className="crm-aviso">
          Todavía no hay prospectos. Los que califique el chatbot aparecerán aquí.
        </p>
      )}

      {!cargando && !error && prospectos.length > 0 && (
        <>
          <BarraHerramientas
            busqueda={busqueda}
            onBuscar={setBusqueda}
            filtroCanal={filtroCanal}
            onCambiarCanal={setFiltroCanal}
            exportando={exportando}
            onExportar={() => void exportar()}
          />

          <TablaProspectos
            prospectos={visibles}
            filtro={filtro}
            onFiltrar={setFiltro}
            conteos={resumen.porEtapa}
            total={resumen.total}
            onAbrir={(prospecto) => setSeleccionadoId(prospecto.id)}
          />
        </>
      )}

      {seleccionado && (
        <PanelDetalle
          prospecto={seleccionado}
          asesores={asesores}
          asignando={asignandoId === seleccionado.id}
          onAsignar={(asesorId) => void asignar(seleccionado.id, asesorId)}
          onCerrar={() => setSeleccionadoId(null)}
        />
      )}
    </div>
  )
}

export default CrmPage
