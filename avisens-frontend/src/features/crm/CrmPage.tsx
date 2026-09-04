import { useState } from 'react'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import { useProspectos } from './hooks/useProspectos'
import { useFiltroProspectos } from './hooks/useFiltroProspectos'
import { useResumenProspectos } from './hooks/useResumenProspectos'
import type { ProspectoVista } from './model/prospectoVista'
import ResumenCrm from './components/ResumenCrm'
import BarraHerramientas from './components/BarraHerramientas'
import TableroKanban from './components/TableroKanban'
import TablaProspectos from './components/TablaProspectos'
import PanelDetalle from './components/PanelDetalle'
import '@shared/ui/admin/AdminKit.css'
import './CrmPage.css'

function CrmPage() {
  const { prospectos, cargando, error, recargar } = useProspectos()
  const {
    vista,
    setVista,
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
  const [seleccionado, setSeleccionado] = useState<ProspectoVista | null>(null)

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
            vista={vista}
            onCambiarVista={setVista}
            filtroCanal={filtroCanal}
            onCambiarCanal={setFiltroCanal}
          />

          {vista === 'kanban' ? (
            <TableroKanban prospectos={visibles} onAbrir={setSeleccionado} />
          ) : (
            <TablaProspectos
              prospectos={visibles}
              filtro={filtro}
              onFiltrar={setFiltro}
              conteos={resumen.porEtapa}
              total={resumen.total}
              onAbrir={setSeleccionado}
            />
          )}
        </>
      )}

      {seleccionado && (
        <PanelDetalle prospecto={seleccionado} onCerrar={() => setSeleccionado(null)} />
      )}
    </div>
  )
}

export default CrmPage
