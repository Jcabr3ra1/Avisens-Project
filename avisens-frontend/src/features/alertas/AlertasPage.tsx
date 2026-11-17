import { useMemo, useState } from 'react'
import { getRol } from '@shared/api'
import { ROL_OPERARIO } from '@shared/auth/permisos'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import BotonActualizar from '@shared/ui/BotonActualizar/BotonActualizar'
import SinGalponesAsignados from '@shared/ui/Estados/SinGalponesAsignados'
import BannerAlertaCritica from './components/BannerAlertaCritica'
import FiltrosAlertas from './components/FiltrosAlertas'
import ListaAlertas from './components/ListaAlertas'
import PanelAlerta from './components/PanelAlerta'
import ResumenAlertas from './components/ResumenAlertas'
import { useAlertas } from './hooks/useAlertas'
import { useGalponesAsignados } from './hooks/useGalponesAsignados'
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
  // El operario solo ve sus galpones asignados: los textos hablan de «tus
  // galpones» y, si no tiene ninguno, se le dice en vez de un «Todo en orden»
  // engañoso (auditoría QA 2026-10-30, HALL-03).
  const esOperario = getRol() === ROL_OPERARIO
  const asignacion = useGalponesAsignados(esOperario && !embebida)
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
      {!embebida && (
        <CabeceraAdmin
          eyebrow="Monitoreo · Alertas"
          titulo="Alertas"
          subtitulo={esOperario
            ? 'Revisa, atiende y deja registrada cada situación que detecten los sensores de tus galpones.'
            : 'Revisa, atiende y deja registrada cada situación detectada por los sensores.'}
          acciones={(
            <BotonActualizar
              cargando={cargando}
              onActualizar={() => Promise.all([recargar(), asignacion.recargar()])}
            />
          )}
        />
      )}

      {asignacion.sinGalpones ? (
        <SinGalponesAsignados queVerias="las alertas que detecten los sensores de tus galpones" />
      ) : <>

      {error && (
        <div className="ale-error adm-alerta" role="alert">
          {error}
          <button type="button" onClick={() => void recargar()}>Reintentar</button>
        </div>
      )}
      <BannerAlertaCritica alertas={alertas} onAbrir={setSeleccionada} />
      <ResumenAlertas
        resumen={resumen}
        cargando={cargando}
        alcance={embebida ? 'En este galpón' : esOperario ? 'En tus galpones' : undefined}
      />
      {!embebida && <FiltrosAlertas
        alertas={alertas}
        etiquetaTodos={esOperario ? 'Todos mis galpones' : undefined}
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
      </>}
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
