import { useMemo, useState } from 'react'
import { IcChevronDown, IcRefresh, IcSearch } from '@shared/ui/icons/icons'
import PanelRecuperacion from './components/PanelRecuperacion'
import TablaRecuperaciones from './components/TablaRecuperaciones'
import { useRecuperacionesPassword } from './hooks/useRecuperacionesPassword'
import { ETIQUETAS_ESTADO_RECUPERACION, type EstadoRecuperacionPassword, type RecuperacionPassword } from './model/recuperacionPassword'
import EstadoVacio from '@shared/ui/Estados/EstadoVacio'
import Cargando from '@shared/ui/Estados/Cargando'
import '@shared/ui/admin/AdminKit.css'
import './RecuperacionesPassword.css'

type FiltroEstado = 'todos' | EstadoRecuperacionPassword

const ORDEN_ESTADO: Record<EstadoRecuperacionPassword, number> = { pendiente: 0, aprobada: 1, rechazada: 2, completada: 2 }

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es-CO').trim()
}

function Indicador({ etiqueta, valor, nota, tono }: { etiqueta: string; valor: number | null; nota: string; tono?: 'aviso' }) {
  return (
    <li className={`rec-indicador${tono ? ` rec-indicador--${tono}` : ''}`}>
      <span className="rec-indicador-label">{etiqueta}</span>
      <strong className="rec-indicador-valor">{valor ?? '—'}</strong>
      <span className="rec-indicador-nota">{nota}</span>
    </li>
  )
}

function RecuperacionesPasswordPage() {
  const { solicitudes, cargando, error, cargar, aprobar, rechazar } = useRecuperacionesPassword()
  const [seleccionada, setSeleccionada] = useState<RecuperacionPassword | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<FiltroEstado>('todos')

  const pendientes = solicitudes.filter((solicitud) => solicitud.estado === 'pendiente').length
  const aprobadas = solicitudes.filter((solicitud) => solicitud.estado === 'aprobada').length
  const cerradas = solicitudes.length - pendientes - aprobadas
  const listo = !cargando && !error

  const visibles = useMemo(() => {
    const termino = normalizar(busqueda)
    return solicitudes
      .filter((solicitud) => estado === 'todos' || solicitud.estado === estado)
      .filter((solicitud) => !termino || [solicitud.usuario.nombre_completo, solicitud.usuario.username, solicitud.usuario.cedula, solicitud.usuario.email]
        .some((valor) => valor && normalizar(valor).includes(termino)))
      .sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] || new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
  }, [busqueda, estado, solicitudes])

  return (
    <div className="page-container rec-page adm-page">
      <header className="rec-cabecera">
        <div>
          <span className="adm-eyebrow">
            <span className="adm-eyebrow-punto" aria-hidden="true" />
            Plataforma · Acceso
          </span>
          <h1 className="rec-titulo">Recuperar acceso</h1>
          <p className="rec-subtitulo">Verifica a la persona y genera una contraseña temporal de un solo uso.</p>
        </div>
        <button type="button" className="rec-boton-cabecera" onClick={() => void cargar()} disabled={cargando}>
          <IcRefresh size={17} aria-hidden="true" />
          {cargando ? 'Actualizando…' : 'Actualizar'}
        </button>
      </header>

      <ul className="rec-indicadores" aria-label="Resumen de recuperaciones de contraseña">
        <Indicador etiqueta="Por revisar" valor={listo ? pendientes : null} nota={pendientes ? 'Esperan verificación' : 'Nada pendiente'} tono={pendientes ? 'aviso' : undefined} />
        <Indicador etiqueta="Acceso temporal" valor={listo ? aprobadas : null} nota="Aún no cambian su clave" />
        <Indicador etiqueta="Cerradas" valor={listo ? cerradas : null} nota="Completadas o rechazadas" />
        <Indicador etiqueta="Total" valor={listo ? solicitudes.length : null} nota="Solicitudes registradas" />
      </ul>

      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void cargar()}>Reintentar</button>
        </div>
      )}

      {!cargando && solicitudes.length > 0 && (
        <div className="rec-herramientas">
          <label className="rec-buscador">
            <span className="sr-only">Buscar solicitud</span>
            <IcSearch size={17} aria-hidden="true" />
            <input type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar por nombre, usuario o documento…" autoComplete="off" />
          </label>
          <label className="rec-desplegable">
            <span className="sr-only">Filtrar por estado</span>
            <select value={estado} onChange={(evento) => setEstado(evento.target.value as FiltroEstado)}>
              <option value="todos">Estado: todos</option>
              {(Object.keys(ETIQUETAS_ESTADO_RECUPERACION) as EstadoRecuperacionPassword[]).map((valor) => (
                <option key={valor} value={valor}>{ETIQUETAS_ESTADO_RECUPERACION[valor]}</option>
              ))}
            </select>
            <IcChevronDown size={17} aria-hidden="true" />
          </label>
          <span className="rec-conteo">{visibles.length} de {solicitudes.length}</span>
        </div>
      )}

      {cargando ? (
        <Cargando texto="Cargando solicitudes…" />
      ) : error ? null : solicitudes.length === 0 ? (
        <EstadoVacio
          className="rec-vacio"
          titulo="No hay solicitudes"
          texto="Cuando un propietario u operario pida recuperar su acceso, aparecerá aquí para verificarlo."
        />
      ) : visibles.length === 0 ? (
        <EstadoVacio
          className="rec-vacio"
          titulo="Sin coincidencias"
          texto="Ninguna solicitud coincide con la búsqueda o el estado."
          accion={<button type="button" className="adm-btn adm-btn--secundario" onClick={() => { setBusqueda(''); setEstado('todos') }}>Limpiar filtros</button>}
        />
      ) : (
        <TablaRecuperaciones solicitudes={visibles} onAbrir={setSeleccionada} />
      )}

      {seleccionada && <PanelRecuperacion solicitud={seleccionada} onCerrar={() => setSeleccionada(null)} onAprobar={aprobar} onRechazar={rechazar} />}
    </div>
  )
}

export default RecuperacionesPasswordPage
