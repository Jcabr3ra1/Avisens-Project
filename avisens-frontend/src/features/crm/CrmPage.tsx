import { useState } from 'react'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import BarraHerramientas, { type OpcionFiltro } from '@shared/ui/admin/BarraHerramientas'
import { IcDoc } from '@shared/ui/icons/icons'
import { useProspectos } from './hooks/useProspectos'
import { payloadDeConversion } from './model/conversion'
import {
  useFiltroProspectos,
  type Filtro,
  type FiltroCanal,
} from './hooks/useFiltroProspectos'
import { useResumenProspectos } from './hooks/useResumenProspectos'
import { ETAPAS } from './model/prospectoVista'
import { ESTILO_ETAPA } from './model/etapas'
import ResumenCrm from './components/ResumenCrm'
import TablaProspectos from './components/TablaProspectos'
import PanelDetalle from './components/PanelDetalle'
import '@shared/ui/admin/AdminKit.css'
import './CrmPage.css'

const OPCIONES_CANAL: { valor: FiltroCanal; label: string }[] = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'web', label: 'Web' },
  { valor: 'whatsapp', label: 'WhatsApp' },
]

function CrmPage() {
  const {
    prospectos, asesores, cargando, asignandoId, exportando, error,
    recargar, asignar, exportar, convertir,
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
  const seleccionado = prospectos.find((prospecto) => prospecto.id === seleccionadoId) ?? null

  const sinProspectos = !cargando && !error && prospectos.length === 0

  const opcionesEtapa: OpcionFiltro<Filtro>[] = [
    { valor: 'todos', label: `Todos (${resumen.total})` },
    ...ETAPAS.map((etapa) => ({
      valor: etapa,
      label: `${ESTILO_ETAPA[etapa].label} (${resumen.porEtapa[etapa]})`,
    })),
  ]

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
        <section className="adm-panel" aria-label="Prospectos">
          <BarraHerramientas
            busqueda={busqueda}
            placeholder="Buscar prospecto, granja o municipio…"
            etiquetaBusqueda="Buscar prospectos"
            onBuscar={setBusqueda}
            filtro={filtro}
            opciones={opcionesEtapa}
            etiquetaFiltro="Filtrar prospectos por etapa"
            onCambiarFiltro={setFiltro}
            visibles={visibles.length}
            total={prospectos.length}
            extra={(
              <label>
                Origen
                <select
                  value={filtroCanal}
                  onChange={(evento) => setFiltroCanal(evento.target.value as FiltroCanal)}
                >
                  {OPCIONES_CANAL.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>{opcion.label}</option>
                  ))}
                </select>
              </label>
            )}
            acciones={(
              <button
                type="button"
                className="adm-btn adm-btn--secundario"
                onClick={() => void exportar()}
                disabled={exportando}
              >
                <IcDoc size={16} aria-hidden="true" />
                {exportando ? 'Exportando…' : 'Exportar CSV'}
              </button>
            )}
          />

          <TablaProspectos
            prospectos={visibles}
            onAbrir={(prospecto) => setSeleccionadoId(prospecto.id)}
          />
        </section>
      )}

      {seleccionado && (
        <PanelDetalle
          prospecto={seleccionado}
          asesores={asesores}
          asignando={asignandoId === seleccionado.id}
          onAsignar={(asesorId) => void asignar(seleccionado.id, asesorId)}
          onConvertir={(form) => convertir(seleccionado.id, payloadDeConversion(form))}
          onCerrar={() => setSeleccionadoId(null)}
        />
      )}
    </div>
  )
}

export default CrmPage
