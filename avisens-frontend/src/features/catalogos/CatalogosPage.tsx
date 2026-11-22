import { confirmarAccion } from '@shared/ui/ConfirmarAccion/gestorConfirmacion'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  IcChevronDown,
  IcClose,
  IcEdit,
  IcPlus,
  IcSearch,
  IcSeed,
  IcThermo,
  IcTrash,
} from '@shared/ui/icons/icons'
import { getRol } from '@shared/api'
import { permisosDeGestion } from '@shared/auth/permisos'
import { useRefetchOnFocus } from '@shared/hooks/useRefetchOnFocus'
import type { TipoAlimento } from '@features/consumos-diarios/api/tipos-alimento'
import type { CatalogoSensor } from '@features/sensores/api/catalogoSensores'
import type { CurvaObjetivo } from '@features/indicadores/api/curvas-objetivo'
import FormularioSensor from './components/FormularioSensor'
import FormularioCurva from './components/FormularioCurva'
import FormularioTipoAlimento from './components/FormularioTipoAlimento'
import TablaCurvas from './components/TablaCurvas'
import { useCatalogoSensores } from './hooks/useCatalogoSensores'
import { useCurvasObjetivo } from './hooks/useCurvasObjetivo'
import { useTiposAlimento } from './hooks/useTiposAlimento'
import {
  capitalizar,
  etiquetaEtapa,
  filtrarAlimentos,
  filtrarSensores,
  gramos,
  pesos,
  rangoDeDias,
  type FiltroDisponibilidad,
  type Pestana,
} from './model/catalogos'
import '@shared/ui/admin/AdminKit.css'
import './CatalogosPage.css'

function IndicadorFiltro({ etiqueta, valor, nota, activo, tono, onClick }: {
  etiqueta: string
  valor: number | null
  nota: string
  activo: boolean
  tono?: 'alerta'
  onClick: () => void
}) {
  return (
    <li className="cat-indicador">
      <button
        type="button"
        className={`cat-indicador-btn${activo ? ' is-activo' : ''}${tono ? ` is-${tono}` : ''}`}
        aria-pressed={activo}
        onClick={onClick}
      >
        <span className="cat-indicador-label">{etiqueta}</span>
        <strong className="cat-indicador-valor">
          {valor === null ? <span className="cat-esqueleto-num org-brilla" aria-hidden="true" /> : valor}
        </strong>
        <span className="cat-indicador-nota">{nota}</span>
      </button>
    </li>
  )
}

function Interruptor({ activo, etiqueta, onCambiar, deshabilitado }: {
  activo: boolean
  etiqueta: string
  onCambiar: () => void
  deshabilitado: boolean
}) {
  return (
    <label className={`cat-interruptor${deshabilitado ? ' is-fijo' : ''}`}>
      <input type="checkbox" checked={activo} onChange={onCambiar} disabled={deshabilitado} aria-label={etiqueta} />
      <span className="cat-interruptor-riel" aria-hidden="true" />
      <span className={`cat-estado cat-estado--${activo ? 'activo' : 'retirado'}`}>{activo ? 'Disponible' : 'Retirado'}</span>
    </label>
  )
}

function CatalogosPage() {
  const puedeGestionar = permisosDeGestion(getRol()).crear
  const [pestana, setPestana] = useState<Pestana>('alimentos')
  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroDisponibilidad>('todos')
  const buscadorRef = useRef<HTMLInputElement>(null)

  const alimentos = useTiposAlimento()
  const curvas = useCurvasObjetivo()
  const sensores = useCatalogoSensores()

  useRefetchOnFocus(() => {
    if (pestana === 'alimentos') void alimentos.recargar(true)
    else if (pestana === 'curvas') void curvas.recargar(true)
    else void sensores.recargar(true)
  })

  useEffect(() => {
    function atajoBuscar(evento: KeyboardEvent) {
      if (evento.key !== '/' || evento.metaKey || evento.ctrlKey || evento.altKey) return
      const activo = document.activeElement
      if (activo instanceof HTMLInputElement || activo instanceof HTMLTextAreaElement || activo instanceof HTMLSelectElement) return
      if (pestana === 'curvas') return
      evento.preventDefault()
      buscadorRef.current?.focus()
    }
    window.addEventListener('keydown', atajoBuscar)
    return () => window.removeEventListener('keydown', atajoBuscar)
  }, [pestana])

  const [formAlimento, setFormAlimento] = useState<{ abierto: boolean; editando: TipoAlimento | null }>(
    { abierto: false, editando: null },
  )
  const [formSensor, setFormSensor] = useState<{ abierto: boolean; editando: CatalogoSensor | null }>(
    { abierto: false, editando: null },
  )
  const [formCurva, setFormCurva] = useState<{ abierto: boolean; editando: CurvaObjetivo | null }>(
    { abierto: false, editando: null },
  )

  async function borrarCurva(curva: CurvaObjetivo) {
    if (!(await confirmarAccion({
      titulo: '¿Eliminar este punto de referencia?',
      entidad: `${curva.marca} · ${curva.sexo} · día ${curva.dia}`,
      descripcion: 'Los lotes de esa marca dejarán de compararse contra él.',
      textoConfirmar: 'Eliminar punto',
      tono: 'peligro',
    }))) return
    void curvas.eliminar(curva)
  }

  async function borrarAlimento(tipo: TipoAlimento) {
    if (!(await confirmarAccion({
      titulo: '¿Eliminar este alimento?',
      entidad: tipo.nombre,
      descripcion: 'Si solo quieres dejar de ofrecerlo, retíralo del catálogo en vez de eliminarlo.',
      textoConfirmar: 'Eliminar alimento',
      tono: 'peligro',
    }))) return
    void alimentos.eliminar(tipo)
  }

  const cargandoTodo = alimentos.cargando || curvas.cargando || sensores.cargando
  const marcasCurva = useMemo(() => new Set(curvas.curvas.map((curva) => curva.marca)).size, [curvas.curvas])
  const alimentosRetirados = useMemo(() => alimentos.tipos.filter((tipo) => !tipo.activo).length, [alimentos.tipos])
  const sensoresRetirados = useMemo(() => sensores.sensores.filter((sensor) => !sensor.activo).length, [sensores.sensores])
  const retirados = alimentosRetirados + sensoresRetirados

  const alimentosVisibles = useMemo(
    () => filtrarAlimentos(alimentos.tipos, { busqueda, estado: estadoFiltro }),
    [alimentos.tipos, busqueda, estadoFiltro],
  )
  const sensoresVisibles = useMemo(
    () => filtrarSensores(sensores.sensores, { busqueda, estado: estadoFiltro }),
    [sensores.sensores, busqueda, estadoFiltro],
  )

  const hayFiltros = busqueda.trim() !== '' || estadoFiltro !== 'todos'

  function elegirPestana(nueva: Pestana) {
    setPestana(nueva)
    setBusqueda('')
    setEstadoFiltro('todos')
  }

  function verRetirados() {
    if (estadoFiltro === 'retirados' && pestana !== 'curvas') {
      setEstadoFiltro('todos')
      return
    }
    if (pestana === 'curvas') {
      setPestana(alimentosRetirados > 0 || sensoresRetirados === 0 ? 'alimentos' : 'sensores')
    }
    setBusqueda('')
    setEstadoFiltro('retirados')
  }

  function abrirCrearPrincipal() {
    if (pestana === 'alimentos') setFormAlimento({ abierto: true, editando: null })
    else if (pestana === 'curvas') setFormCurva({ abierto: true, editando: null })
    else setFormSensor({ abierto: true, editando: null })
  }

  const etiquetaCrear = pestana === 'alimentos'
    ? 'Nuevo alimento'
    : pestana === 'curvas'
      ? 'Nuevo punto'
      : 'Nuevo sensor'

  return (
    <div className="page-container cat-page adm-page">
      <header className="cat-cabecera">
        <div>
          <span className="adm-eyebrow">
            <span className="adm-eyebrow-punto" aria-hidden="true" />
            Plataforma · Configuración
          </span>
          <h1 className="cat-titulo">Catálogos</h1>
          <p className="cat-subtitulo">Las listas maestras que alimentan los lotes, consumos y cotizaciones.</p>
        </div>
        {puedeGestionar && (
          <button type="button" className="cat-boton-nuevo" onClick={abrirCrearPrincipal}>
            <IcPlus size={16} aria-hidden="true" />
            {etiquetaCrear}
          </button>
        )}
      </header>

      <ul className="cat-indicadores" aria-label="Cambiar de catálogo">
        <IndicadorFiltro
          etiqueta="Tipos de alimento"
          valor={cargandoTodo ? null : alimentos.tipos.length}
          nota={`${alimentos.tipos.filter((tipo) => tipo.activo).length} disponibles`}
          activo={pestana === 'alimentos' && estadoFiltro !== 'retirados'}
          onClick={() => elegirPestana('alimentos')}
        />
        <IndicadorFiltro
          etiqueta="Curvas objetivo"
          valor={cargandoTodo ? null : curvas.curvas.length}
          nota={marcasCurva === 1 ? '1 marca' : `${marcasCurva} marcas`}
          activo={pestana === 'curvas'}
          onClick={() => elegirPestana('curvas')}
        />
        <IndicadorFiltro
          etiqueta="Modelos de sensor"
          valor={cargandoTodo ? null : sensores.sensores.length}
          nota={`${sensores.sensores.filter((sensor) => sensor.obligatorio).length} obligatorios`}
          activo={pestana === 'sensores' && estadoFiltro !== 'retirados'}
          onClick={() => elegirPestana('sensores')}
        />
        <IndicadorFiltro
          etiqueta="Retirados"
          valor={cargandoTodo ? null : retirados}
          nota="Alimentos y sensores"
          activo={estadoFiltro === 'retirados' && pestana !== 'curvas'}
          tono={retirados > 0 ? 'alerta' : undefined}
          onClick={verRetirados}
        />
      </ul>

      {pestana !== 'curvas' && (
        <div className="cat-barra">
          <label className="cat-buscador">
            <span className="sr-only">Buscar en catálogo</span>
            <IcSearch size={16} aria-hidden="true" />
            <input
              ref={buscadorRef}
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder={pestana === 'alimentos'
                ? 'Buscar alimento por nombre, marca o etapa…'
                : 'Buscar sensor por nombre, código o descripción…'}
              autoComplete="off"
            />
            {busqueda ? (
              <button
                type="button"
                className="cat-limpiar-busqueda"
                onClick={() => setBusqueda('')}
                aria-label="Limpiar búsqueda"
              >
                <IcClose size={13} aria-hidden="true" />
              </button>
            ) : (
              <kbd aria-hidden="true">/</kbd>
            )}
          </label>

          <div className="cat-barra-controles">
            <label className="cat-desplegable">
              <span className="sr-only">Filtrar por disponibilidad</span>
              <select
                value={estadoFiltro}
                onChange={(evento) => setEstadoFiltro(evento.target.value as FiltroDisponibilidad)}
              >
                <option value="todos">Estado: todos</option>
                <option value="disponibles">Solo disponibles</option>
                <option value="retirados">Solo retirados</option>
              </select>
              <IcChevronDown size={16} aria-hidden="true" />
            </label>

            <span className="cat-conteo">
              {pestana === 'alimentos'
                ? `${alimentosVisibles.length} de ${alimentos.tipos.length}`
                : `${sensoresVisibles.length} de ${sensores.sensores.length}`}
            </span>

            {hayFiltros && (
              <button
                type="button"
                className="cat-filtro-limpiar"
                onClick={() => { setBusqueda(''); setEstadoFiltro('todos') }}
              >
                Limpiar <IcClose size={13} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}

      {pestana === 'alimentos' && (
        <section className="cat-seccion" aria-label="Tipos de alimento">
          {alimentos.error && (
            <div className="adm-alerta" role="alert">
              <span>{alimentos.error}</span>
              <button type="button" onClick={() => void alimentos.recargar()}>Reintentar</button>
            </div>
          )}

          {alimentos.cargando ? (
            <div className="cat-grid" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => <div key={i} className="cat-card-esqueleto org-brilla" />)}
            </div>
          ) : alimentos.tipos.length === 0 ? (
            <div className="cat-vacio cat-vacio--caja">
              <h2>El catálogo está vacío</h2>
              <p>Sin tipos de alimento, el consumo diario no puede dejar constancia de qué se le dio al lote.</p>
            </div>
          ) : alimentosVisibles.length === 0 ? (
            <div className="cat-vacio cat-vacio--caja">
              <h2>Sin coincidencias</h2>
              <p>Ningún tipo de alimento coincide con la búsqueda o el estado seleccionado.</p>
              <button type="button" className="adm-btn adm-btn--secundario" onClick={() => { setBusqueda(''); setEstadoFiltro('todos') }}>
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="cat-grid">
              {alimentosVisibles.map((tipo) => (
                <article key={tipo.id} className={`cat-card${tipo.activo ? '' : ' is-retirado'}`}>
                  <header className="cat-card-top">
                    <span className="cat-card-icono" aria-hidden="true"><IcSeed size={18} /></span>
                    <div className="cat-card-titulo">
                      <h3>{tipo.nombre}</h3>
                      <span>{tipo.marca ? capitalizar(tipo.marca) : 'Sin marca'}</span>
                    </div>
                    <span className="cat-chip">{tipo.etapa ? etiquetaEtapa(tipo.etapa) : 'Sin etapa'}</span>
                  </header>

                  <dl className="cat-card-datos">
                    <div>
                      <dt>Presentación</dt>
                      <dd>{tipo.presentacion ? capitalizar(tipo.presentacion) : '—'}</dd>
                    </div>
                    <div>
                      <dt>Días de vida</dt>
                      <dd>{rangoDeDias(tipo.dia_inicio, tipo.dia_fin)}</dd>
                    </div>
                    <div>
                      <dt>Consumo esperado</dt>
                      <dd>{gramos(tipo.consumo_total_esperado_g)}</dd>
                    </div>
                  </dl>

                  <footer className="cat-card-pie">
                    <Interruptor
                      activo={tipo.activo}
                      etiqueta={`${tipo.activo ? 'Retirar' : 'Reactivar'} ${tipo.nombre}`}
                      onCambiar={() => void alimentos.alternar(tipo)}
                      deshabilitado={!puedeGestionar}
                    />
                    {puedeGestionar && (
                      <div className="cat-acciones">
                        <button
                          type="button"
                          className="cat-btn-texto"
                          onClick={() => setFormAlimento({ abierto: true, editando: tipo })}
                        >
                          <IcEdit size={14} aria-hidden="true" />
                          Editar
                        </button>
                        <button
                          type="button"
                          className="cat-btn-icono cat-btn-icono--peligro"
                          onClick={() => void borrarAlimento(tipo)}
                          aria-label={`Eliminar ${tipo.nombre}`}
                          title="Eliminar"
                        >
                          <IcTrash size={14} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {pestana === 'curvas' && (
        <TablaCurvas
          curvas={curvas.curvas}
          cargando={curvas.cargando}
          error={curvas.error}
          puedeGestionar={puedeGestionar}
          onRecargar={() => void curvas.recargar()}
          onEditar={(curva) => setFormCurva({ abierto: true, editando: curva })}
          onEliminar={borrarCurva}
        />
      )}

      {pestana === 'sensores' && (
        <section className="cat-seccion" aria-label="Catálogo de sensores">
          {sensores.error && (
            <div className="adm-alerta" role="alert">
              <span>{sensores.error}</span>
              <button type="button" onClick={() => void sensores.recargar()}>Reintentar</button>
            </div>
          )}

          {sensores.cargando ? (
            <div className="cat-grid" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => <div key={i} className="cat-card-esqueleto org-brilla" />)}
            </div>
          ) : sensores.sensores.length === 0 ? (
            <div className="cat-vacio cat-vacio--caja">
              <h2>No hay sensores en el catálogo</h2>
              <p>Sin modelos, no se pueden equipar los galpones ni cotizar una instalación.</p>
            </div>
          ) : sensoresVisibles.length === 0 ? (
            <div className="cat-vacio cat-vacio--caja">
              <h2>Sin coincidencias</h2>
              <p>Ningún sensor coincide con la búsqueda o el estado seleccionado.</p>
              <button type="button" className="adm-btn adm-btn--secundario" onClick={() => { setBusqueda(''); setEstadoFiltro('todos') }}>
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="cat-grid">
              {sensoresVisibles.map((sensor) => (
                <article key={sensor.id} className={`cat-card${sensor.activo ? '' : ' is-retirado'}`}>
                  <header className="cat-card-top">
                    <span className="cat-card-icono" aria-hidden="true"><IcThermo size={18} /></span>
                    <div className="cat-card-titulo">
                      <h3>{sensor.nombre}</h3>
                      <code className="cat-codigo">{sensor.tipo_sensor}</code>
                    </div>
                    <span className={`cat-chip${sensor.obligatorio ? ' cat-chip--fuerte' : ''}`}>
                      {sensor.obligatorio ? 'Obligatorio' : 'Opcional'}
                    </span>
                  </header>

                  {sensor.descripcion && <p className="cat-card-desc">{sensor.descripcion}</p>}

                  <dl className="cat-card-datos cat-card-datos--doble">
                    <div>
                      <dt>Precio unitario</dt>
                      <dd>{pesos(sensor.precio_unitario_cop)}</dd>
                    </div>
                    <div>
                      <dt>Cobertura</dt>
                      <dd>{sensor.cobertura_m2 === null ? '—' : `${sensor.cobertura_m2} m²`}</dd>
                    </div>
                  </dl>

                  <footer className="cat-card-pie">
                    <Interruptor
                      activo={sensor.activo}
                      etiqueta={`${sensor.activo ? 'Retirar' : 'Reactivar'} ${sensor.nombre}`}
                      onCambiar={() => void sensores.alternar(sensor)}
                      deshabilitado={!puedeGestionar}
                    />
                    {puedeGestionar && (
                      <button
                        type="button"
                        className="cat-btn-texto"
                        onClick={() => setFormSensor({ abierto: true, editando: sensor })}
                      >
                        <IcEdit size={14} aria-hidden="true" />
                        Editar
                      </button>
                    )}
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {formAlimento.abierto && (
        <FormularioTipoAlimento
          editando={formAlimento.editando}
          onGuardar={alimentos.guardar}
          onCerrar={() => setFormAlimento({ abierto: false, editando: null })}
        />
      )}

      {formCurva.abierto && (
        <FormularioCurva
          editando={formCurva.editando}
          onGuardar={curvas.guardar}
          onCerrar={() => setFormCurva({ abierto: false, editando: null })}
        />
      )}

      {formSensor.abierto && (
        <FormularioSensor
          editando={formSensor.editando}
          onGuardar={sensores.guardar}
          onCerrar={() => setFormSensor({ abierto: false, editando: null })}
        />
      )}
    </div>
  )
}

export default CatalogosPage
