import { useMemo, useState } from 'react'
import { IcPlus, IcRefresh } from '@shared/ui/icons/icons'
import { getRol } from '@shared/api'
import { permisosDeGestion } from '@shared/auth/permisos'
import type { TipoAlimento } from '@features/consumos-diarios/api/tipos-alimento'
import type { CatalogoSensor } from '@features/sensores/api/catalogoSensores'
import type { CurvaObjetivo } from '@features/indicadores/api/curvas-objetivo'
import MenuAcciones from '@shared/ui/MenuAcciones/MenuAcciones'
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
  gramos,
  pesos,
  PESTANAS,
  rangoDeDias,
  type Pestana,
} from './model/catalogos'
import '@shared/ui/admin/AdminKit.css'
import './CatalogosPage.css'

function Indicador({ etiqueta, valor, nota }: { etiqueta: string; valor: number | null; nota: string }) {
  return (
    <li className="cat-indicador">
      <span className="cat-indicador-label">{etiqueta}</span>
      <strong className="cat-indicador-valor">{valor ?? '—'}</strong>
      <span className="cat-indicador-nota">{nota}</span>
    </li>
  )
}

function Interruptor({ activo, etiqueta, onCambiar, deshabilitado }: { activo: boolean; etiqueta: string; onCambiar: () => void; deshabilitado: boolean }) {
  return (
    <label className={`cat-interruptor${deshabilitado ? ' is-fijo' : ''}`}>
      <input type="checkbox" checked={activo} onChange={onCambiar} disabled={deshabilitado} aria-label={etiqueta} />
      <span className="cat-interruptor-riel" aria-hidden="true" />
      <span className={`cat-estado cat-estado--${activo ? 'activo' : 'retirado'}`}>{activo ? 'Disponible' : 'Retirado'}</span>
    </label>
  )
}

function CatalogosPage() {
  // Solo el Administrador gestiona los catálogos globales. Un botón sin
  // permiso se oculta, no se deshabilita.
  const puedeGestionar = permisosDeGestion(getRol()).crear
  const [pestana, setPestana] = useState<Pestana>('alimentos')

  const alimentos = useTiposAlimento()
  const curvas = useCurvasObjetivo()
  const sensores = useCatalogoSensores()

  const [formAlimento, setFormAlimento] = useState<{ abierto: boolean; editando: TipoAlimento | null }>(
    { abierto: false, editando: null },
  )
  const [formSensor, setFormSensor] = useState<{ abierto: boolean; editando: CatalogoSensor | null }>(
    { abierto: false, editando: null },
  )
  const [formCurva, setFormCurva] = useState<{ abierto: boolean; editando: CurvaObjetivo | null }>(
    { abierto: false, editando: null },
  )

  function borrarCurva(curva: CurvaObjetivo) {
    if (!window.confirm(
      `¿Eliminar el punto de ${curva.marca} · ${curva.sexo} · día ${curva.dia}? Los lotes de esa marca dejarán de compararse contra él.`,
    )) return
    void curvas.eliminar(curva)
  }

  const activa = useMemo(
    () => PESTANAS.find((item) => item.id === pestana) ?? PESTANAS[0],
    [pestana],
  )

  const cargando = pestana === 'alimentos' ? alimentos.cargando
    : pestana === 'curvas' ? curvas.cargando
    : sensores.cargando

  function recargarActiva() {
    if (pestana === 'alimentos') void alimentos.recargar()
    else if (pestana === 'curvas') void curvas.recargar()
    else void sensores.recargar()
  }

  function borrarAlimento(tipo: TipoAlimento) {
    if (!window.confirm(
      `¿Eliminar permanentemente "${tipo.nombre}"? Si solo quieres dejar de ofrecerlo, retíralo del catálogo en vez de eliminarlo.`,
    )) return
    void alimentos.eliminar(tipo)
  }

  const cargandoTodo = alimentos.cargando || curvas.cargando || sensores.cargando
  const marcasCurva = new Set(curvas.curvas.map((curva) => curva.marca)).size
  const retirados = alimentos.tipos.filter((tipo) => !tipo.activo).length + sensores.sensores.filter((sensor) => !sensor.activo).length
  const conteos: Record<Pestana, number> = { alimentos: alimentos.tipos.length, curvas: curvas.curvas.length, sensores: sensores.sensores.length }

  return (
    <div className="page-container cat-page adm-page">
      <header className="cat-cabecera">
        <div>
          <span className="adm-eyebrow">
            <span className="adm-eyebrow-punto" aria-hidden="true" />
            Plataforma · Configuración
          </span>
          <h1 className="cat-titulo">Catálogos</h1>
          <p className="cat-subtitulo">Las listas maestras que alimentan el resto de los módulos.</p>
        </div>
        <button type="button" className="cat-boton-cabecera" onClick={recargarActiva} disabled={cargando}>
          <IcRefresh size={17} aria-hidden="true" />
          {cargando ? 'Actualizando…' : 'Actualizar'}
        </button>
      </header>

      <ul className="cat-indicadores" aria-label="Resumen de catálogos">
        <Indicador etiqueta="Tipos de alimento" valor={cargandoTodo ? null : alimentos.tipos.length} nota={`${alimentos.tipos.filter((tipo) => tipo.activo).length} disponibles`} />
        <Indicador etiqueta="Puntos de curva" valor={cargandoTodo ? null : curvas.curvas.length} nota={marcasCurva === 1 ? '1 marca' : `${marcasCurva} marcas`} />
        <Indicador etiqueta="Modelos de sensor" valor={cargandoTodo ? null : sensores.sensores.length} nota={`${sensores.sensores.filter((sensor) => sensor.obligatorio).length} obligatorios`} />
        <Indicador etiqueta="Retirados" valor={cargandoTodo ? null : retirados} nota="Alimentos y sensores" />
      </ul>

      <div className="cat-herramientas">
        <div className="cat-tabs" role="tablist" aria-label="Catálogos del sistema">
          {PESTANAS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={pestana === item.id}
              aria-controls={`panel-${item.id}`}
              className="cat-tab"
              onClick={() => setPestana(item.id)}
            >
              {item.etiqueta}
              <span>{conteos[item.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {pestana === 'alimentos' && (
        <section className="cat-panel" role="tabpanel" id="panel-alimentos" aria-labelledby="tab-alimentos">
          <header className="cat-panel-head">
            <div>
              <h2>Tipos de alimento</h2>
              <p>{activa.descripcion}</p>
            </div>
            {puedeGestionar && (
              <button type="button" className="cat-boton-nuevo" onClick={() => setFormAlimento({ abierto: true, editando: null })}>
                <IcPlus size={16} aria-hidden="true" />
                Nuevo alimento
              </button>
            )}
          </header>

          {alimentos.error && (
            <div className="adm-alerta" role="alert">
              <span>{alimentos.error}</span>
              <button type="button" onClick={() => void alimentos.recargar()}>Reintentar</button>
            </div>
          )}

          {alimentos.cargando ? (
            <p className="cat-vacio" role="status">Cargando tipos de alimento…</p>
          ) : alimentos.tipos.length === 0 ? (
            <div className="cat-vacio">
              <h2>El catálogo está vacío</h2>
              <p>Sin tipos de alimento, el consumo diario no puede dejar constancia de qué se le dio al lote.</p>
            </div>
          ) : (
            <div className="cat-tabla-scroll">
              <table className="cat-tabla cat-tabla--alimentos">
                <thead>
                  <tr>
                    <th scope="col">Alimento</th>
                    <th scope="col">Etapa</th>
                    <th scope="col">Presentación</th>
                    <th scope="col">Días de vida</th>
                    <th scope="col">Consumo esperado</th>
                    <th scope="col">Estado</th>
                    {puedeGestionar && <th scope="col"><span className="sr-only">Acciones</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {alimentos.tipos.map((tipo) => (
                    <tr key={tipo.id} className={tipo.activo ? '' : 'cat-fila--inactiva'}>
                      <td>
                        <span className="cat-celda-texto">
                          <strong>{tipo.nombre}</strong>
                          <span>{tipo.marca ? capitalizar(tipo.marca) : 'Sin marca'}</span>
                        </span>
                      </td>
                      <td><span className="cat-chip">{tipo.etapa ? etiquetaEtapa(tipo.etapa) : 'Sin etapa'}</span></td>
                      <td>{tipo.presentacion ? capitalizar(tipo.presentacion) : '—'}</td>
                      <td className="cat-num">{rangoDeDias(tipo.dia_inicio, tipo.dia_fin)}</td>
                      <td className="cat-num">{gramos(tipo.consumo_total_esperado_g)}</td>
                      <td>
                        <Interruptor activo={tipo.activo} etiqueta={`${tipo.activo ? 'Retirar' : 'Reactivar'} ${tipo.nombre}`} onCambiar={() => void alimentos.alternar(tipo)} deshabilitado={!puedeGestionar} />
                      </td>
                      {puedeGestionar && (
                        <td>
                          <div className="cat-acciones">
                            <MenuAcciones
                              etiqueta={`Acciones de ${tipo.nombre}`}
                              acciones={[
                                { etiqueta: 'Editar', onSeleccionar: () => setFormAlimento({ abierto: true, editando: tipo }) },
                                { etiqueta: 'Eliminar', onSeleccionar: () => borrarAlimento(tipo), peligrosa: true },
                              ]}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
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
          onCrear={() => setFormCurva({ abierto: true, editando: null })}
          onEditar={(curva) => setFormCurva({ abierto: true, editando: curva })}
          onEliminar={borrarCurva}
        />
      )}

      {pestana === 'sensores' && (
        <section className="cat-panel" role="tabpanel" id="panel-sensores" aria-labelledby="tab-sensores">
          <header className="cat-panel-head">
            <div>
              <h2>Catálogo de sensores</h2>
              <p>{activa.descripcion}</p>
            </div>
            {puedeGestionar && (
              <button type="button" className="cat-boton-nuevo" onClick={() => setFormSensor({ abierto: true, editando: null })}>
                <IcPlus size={16} aria-hidden="true" />
                Nuevo sensor
              </button>
            )}
          </header>

          {sensores.error && (
            <div className="adm-alerta" role="alert">
              <span>{sensores.error}</span>
              <button type="button" onClick={() => void sensores.recargar()}>Reintentar</button>
            </div>
          )}

          {sensores.cargando ? (
            <p className="cat-vacio" role="status">Cargando el catálogo de sensores…</p>
          ) : sensores.sensores.length === 0 ? (
            <div className="cat-vacio">
              <h2>No hay sensores en el catálogo</h2>
              <p>Sin modelos, no se pueden equipar los galpones ni cotizar una instalación.</p>
            </div>
          ) : (
            <div className="cat-tabla-scroll">
              <table className="cat-tabla cat-tabla--sensores">
                <thead>
                  <tr>
                    <th scope="col">Sensor</th>
                    <th scope="col">Descripción</th>
                    <th scope="col">Precio</th>
                    <th scope="col">Cobertura</th>
                    <th scope="col">Obligatorio</th>
                    <th scope="col">Estado</th>
                    {puedeGestionar && <th scope="col"><span className="sr-only">Acciones</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {sensores.sensores.map((sensor) => (
                    <tr key={sensor.id} className={sensor.activo ? '' : 'cat-fila--inactiva'}>
                      <td>
                        <span className="cat-celda-texto">
                          <strong>{sensor.nombre}</strong>
                          <code className="cat-codigo">{sensor.tipo_sensor}</code>
                        </span>
                      </td>
                      <td className="cat-desc">{sensor.descripcion || '—'}</td>
                      <td className="cat-num">{pesos(sensor.precio_unitario_cop)}</td>
                      <td className="cat-num">{sensor.cobertura_m2 === null ? '—' : `${sensor.cobertura_m2} m²`}</td>
                      <td><span className={`cat-chip${sensor.obligatorio ? ' cat-chip--fuerte' : ''}`}>{sensor.obligatorio ? 'Sí' : 'No'}</span></td>
                      <td>
                        <Interruptor activo={sensor.activo} etiqueta={`${sensor.activo ? 'Retirar' : 'Reactivar'} ${sensor.nombre}`} onCambiar={() => void sensores.alternar(sensor)} deshabilitado={!puedeGestionar} />
                      </td>
                      {puedeGestionar && (
                        <td>
                          <div className="cat-acciones">
                            <MenuAcciones
                              etiqueta={`Acciones de ${sensor.nombre}`}
                              acciones={[{ etiqueta: 'Editar', onSeleccionar: () => setFormSensor({ abierto: true, editando: sensor }) }]}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
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
