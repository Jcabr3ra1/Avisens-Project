import { useMemo, useState } from 'react'
import { IcAlert } from '@shared/ui/icons/icons'
import BannerAlertaCritica from './components/BannerAlertaCritica'
import FiltrosAlertas from './components/FiltrosAlertas'
import ListaAlertas from './components/ListaAlertas'
import PanelAlerta from './components/PanelAlerta'
import ResumenAlertas from './components/ResumenAlertas'
import { useAlertas } from './hooks/useAlertas'
import {
  filtrarAlertas,
  obtenerResumenAlertas,
  type Alerta,
  type FiltrosAlertas as FiltrosAlertasModel,
} from './model/alerta'
import './AlertasPage.css'

const FILTROS_INICIALES: FiltrosAlertasModel = {
  estado: 'todas',
  criticidad: 'todas',
  galponId: 'todos',
}

function AlertasPage() {
  const { alertas, cargando, actualizandoId, error, recargar, aceptar, cerrar, escalar } = useAlertas()
  const [filtros, setFiltros] = useState<FiltrosAlertasModel>(FILTROS_INICIALES)
  const [seleccionada, setSeleccionada] = useState<Alerta | null>(null)
  const resumen = useMemo(() => obtenerResumenAlertas(alertas), [alertas])
  const alertasFiltradas = useMemo(() => filtrarAlertas(alertas, filtros), [alertas, filtros])

  async function atender(id: number) {
    const seAtendio = await aceptar(id)
    if (seAtendio) {
      setSeleccionada((actual) => (
        actual?.id === id ? { ...actual, estado: 'en_proceso' } : actual
      ))
    }
  }

  return (
    <div className="page-container ale-page">
      <header className="ale-header">
        <div>
          <span className="ale-sobrelinea"><IcAlert size={16} /> Monitoreo de producción</span>
          <h1>Alertas</h1>
          <p>Revisa, atiende y deja registrada cada situación detectada por los sensores.</p>
        </div>
      </header>

      {error && (
        <div className="ale-error" role="alert">
          {error}
          <button type="button" onClick={() => void recargar()}>Reintentar</button>
        </div>
      )}
      <BannerAlertaCritica alertas={alertas} onAbrir={setSeleccionada} />
      <ResumenAlertas resumen={resumen} />
      <FiltrosAlertas
        alertas={alertas}
        filtros={filtros}
        onCambiar={setFiltros}
        onRecargar={() => void recargar()}
        cargando={cargando}
      />
      {cargando ? (
        <p className="ale-cargando" role="status">Cargando alertas registradas…</p>
      ) : (
        <ListaAlertas
          alertas={alertasFiltradas}
          actualizandoId={actualizandoId}
          onAtender={(id) => void atender(id)}
          onVerDetalle={setSeleccionada}
        />
      )}
      <PanelAlerta
        alerta={seleccionada}
        cerrando={actualizandoId === seleccionada?.id}
        onCerrar={cerrar}
        onEscalar={escalar}
        onSalir={() => setSeleccionada(null)}
      />
    </div>
  )
}

export default AlertasPage
