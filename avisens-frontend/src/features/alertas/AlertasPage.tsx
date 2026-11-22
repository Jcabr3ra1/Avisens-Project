import { useMemo, useState } from 'react'
import { getRol } from '@shared/api'
import { ROL_OPERARIO, ROL_PROPIETARIO } from '@shared/auth/permisos'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import SinGalponesAsignados from '@shared/ui/Estados/SinGalponesAsignados'
import AvisoStockBajo from './components/AvisoStockBajo'
import BannerAlertaCritica from './components/BannerAlertaCritica'
import FiltrosAlertas from './components/FiltrosAlertas'
import ListaAlertas from './components/ListaAlertas'
import PanelAlerta from './components/PanelAlerta'
import ResumenAlertas, { type TarjetaResumenAlerta } from './components/ResumenAlertas'
import { useAlertas } from './hooks/useAlertas'
import { useGalponesAsignados } from './hooks/useGalponesAsignados'
import { useStockBajo } from './hooks/useStockBajo'
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
  // Quien trabaja la bodega de su granja ve aquí lo que falta reponer. El
  // administrador no: vería la bodega de todas las organizaciones.
  const rol = getRol()
  const stock = useStockBajo(!embebida && (esOperario || rol === ROL_PROPIETARIO))
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

  function seleccionarResumen(tarjeta: TarjetaResumenAlerta) {
    setFiltros((actual) => {
      if (tarjeta === 'todas') return { ...actual, estado: 'todas', criticidad: 'todas' }
      if (tarjeta === 'abierta') return { ...actual, estado: 'abierta', criticidad: 'todas' }
      if (tarjeta === 'en_proceso') return { ...actual, estado: 'en_proceso', criticidad: 'todas' }
      return { ...actual, estado: 'activas', criticidad: 'alta' }
    })
  }

  const cerradas = alertas.filter((alerta) => alerta.estado === 'cerrada').length

  return (
    <div className={embebida ? 'ale-page ale-page--embebida' : 'page-container ale-page adm-page'}>
      {!embebida && (
        <CabeceraAdmin
          eyebrow="Monitoreo · Alertas"
          titulo="Alertas"
          subtitulo={esOperario
            ? 'Revisa, atiende y deja registrada cada situación que detecten los sensores de tus galpones.'
            : 'Revisa, atiende y deja registrada cada situación detectada por los sensores.'}
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
        filtros={filtros}
        onSeleccionar={seleccionarResumen}
      />
      {!embebida && <AvisoStockBajo insumos={stock.porReponer} />}
      {!embebida ? (
        <FiltrosAlertas
          alertas={alertas}
          etiquetaTodos={esOperario ? 'Todos mis galpones' : undefined}
          filtros={filtros}
          onCambiar={setFiltros}
          onLimpiar={() => setFiltros(FILTROS_INICIALES)}
        />
      ) : alertas.length > 0 ? (
        <div className="ale-pildoras" role="group" aria-label="Filtrar alertas del galpón">
          {(
            [
              { id: 'todas', etiqueta: 'Todas', conteo: resumen.total },
              { id: 'abierta', etiqueta: 'Por atender', conteo: resumen.abiertas },
              { id: 'en_proceso', etiqueta: 'En atención', conteo: resumen.enProceso },
              { id: 'cerrada', etiqueta: 'Cerradas', conteo: cerradas },
            ] as const
          ).map((opcion) => {
            const activa = filtros.estado === opcion.id && filtros.criticidad === 'todas'
            return (
              <button
                key={opcion.id}
                type="button"
                className={`ale-pildora${activa ? ' is-activa' : ''}`}
                aria-pressed={activa}
                onClick={() => setFiltros({ ...FILTROS_INICIALES, estado: opcion.id })}
              >
                <span>{opcion.etiqueta}</span>
                <span className="ale-pildora-conteo">{opcion.conteo}</span>
              </button>
            )
          })}
        </div>
      ) : null}
      {cargando ? (
        <Cargando texto="Cargando alertas registradas…" />
      ) : (
        <ListaAlertas
          alertas={alertasFiltradas}
          hayAlertas={alertas.length > 0}
          embebida={embebida}
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
