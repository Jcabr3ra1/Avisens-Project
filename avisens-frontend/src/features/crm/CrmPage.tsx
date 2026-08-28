import { useState } from 'react'
import { useProspectos } from './hooks/useProspectos'
import { useFiltroProspectos } from './hooks/useFiltroProspectos'
import { useResumenProspectos } from './hooks/useResumenProspectos'
import type { ProspectoVista } from './model/prospectoVista'
import ResumenCrm from './components/ResumenCrm'
import BarraHerramientas from './components/BarraHerramientas'
import TableroKanban from './components/TableroKanban'
import TablaProspectos from './components/TablaProspectos'
import PanelDetalle from './components/PanelDetalle'
import './CrmPage.css'

function CrmPage() {
  const { prospectos, cargando, error, recargar } = useProspectos()
  const { vista, setVista, filtro, setFiltro, busqueda, setBusqueda, visibles } =
    useFiltroProspectos(prospectos)
  const resumen = useResumenProspectos(prospectos)
  const [seleccionado, setSeleccionado] = useState<ProspectoVista | null>(null)

  const sinProspectos = !cargando && !error && prospectos.length === 0

  return (
    <div className="page-container crm-page">
      <ResumenCrm resumen={resumen} />

      {cargando && <p className="crm-aviso">Cargando prospectos…</p>}

      {error && (
        <p className="crm-aviso crm-aviso--error">
          {error}{' '}
          <button className="crm-aviso-reintentar" onClick={() => void recargar()}>
            Reintentar
          </button>
        </p>
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
