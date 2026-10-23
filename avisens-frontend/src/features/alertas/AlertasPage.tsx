import { useMemo, useState } from 'react'
import { IcRefresh } from '@shared/ui/icons/icons'
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
import Cargando from '@shared/ui/Estados/Cargando'
import '@shared/ui/admin/AdminKit.css'
import './AlertasPage.css'

const FILTROS_INICIALES: FiltrosAlertasModel = {
  estado: 'todas',
  criticidad: 'todas',
  galponId: 'todos',
}

type Props = {
  galponFijo?: number
}

function AlertasPage({ galponFijo }: Props = {}) {
  const embebida = galponFijo !== undefined
  const { alertas: todas, cargando, actualizandoId, error, recargar, aceptar, cerrar, escalar } = useAlertas()
  const alertas = useMemo(
    () => (embebida ? todas.filter((alerta) => alerta.galpon_id === galponFijo) : todas),
    [embebida, galponFijo, todas],
  )
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
    <div className={embebida ? 'ale-page ale-page--embebida' : 'page-container ale-page adm-page'}>
      {!embebida && <header className="ale-cabecera">
        <div>
          <span className="adm-eyebrow">
            <span className="adm-eyebrow-punto" aria-hidden="true" />
            Monitoreo · Alertas
          </span>
          <h1 className="ale-titulo">Alertas</h1>
          <p className="ale-subtitulo">Revisa, atiende y deja registrada cada situación detectada por los sensores.</p>
        </div>
        <button type="button" className="ale-boton-cabecera" onClick={() => void recargar()} disabled={cargando}>
          <IcRefresh size={17} aria-hidden="true" />
          {cargando ? 'Actualizando…' : 'Actualizar'}
        </button>
      </header>}

      {error && (
        <div className="ale-error adm-alerta" role="alert">
          {error}
          <button type="button" onClick={() => void recargar()}>Reintentar</button>
        </div>
      )}
      <BannerAlertaCritica alertas={alertas} onAbrir={setSeleccionada} />
      <ResumenAlertas resumen={resumen} cargando={cargando} alcance={embebida ? 'En este galpón' : undefined} />
      {!embebida && <FiltrosAlertas
        alertas={alertas}
        filtros={filtros}
        onCambiar={setFiltros}
        onLimpiar={() => setFiltros(FILTROS_INICIALES)}
      />}
      {cargando ? (
        <Cargando texto="Cargando alertas registradas…" />
      ) : (
        <ListaAlertas
          alertas={alertasFiltradas}
          hayAlertas={alertas.length > 0}
          onLimpiarFiltros={() => setFiltros(FILTROS_INICIALES)}
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
