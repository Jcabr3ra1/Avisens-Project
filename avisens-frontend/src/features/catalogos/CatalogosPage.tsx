import { useMemo, useState } from 'react'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import { IcRefresh } from '@shared/ui/icons/icons'
import { getRol } from '@shared/api'
import { permisosDeGestion } from '@shared/auth/permisos'
import type { TipoAlimento } from '@features/consumos-diarios/api/tipos-alimento'
import type { CatalogoSensor } from '@features/sensores/api/catalogoSensores'
import FormularioSensor from './components/FormularioSensor'
import FormularioTipoAlimento from './components/FormularioTipoAlimento'
import TablaCurvas from './components/TablaCurvas'
import { useCatalogoSensores } from './hooks/useCatalogoSensores'
import { useCurvasObjetivo } from './hooks/useCurvasObjetivo'
import { useTiposAlimento } from './hooks/useTiposAlimento'
import {
  capitalizar,
  gramos,
  pesos,
  PESTANAS,
  rangoDeDias,
  type Pestana,
} from './model/catalogos'
import '@shared/ui/admin/AdminKit.css'
import './CatalogosPage.css'

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

  return (
    <div className="page-container cat-page adm-page">
      <CabeceraAdmin
        eyebrow="Configuración del sistema"
        titulo="Catálogos"
        subtitulo="Las listas maestras que alimentan el resto de los módulos."
        acciones={(
          <button
            type="button"
            className="adm-btn adm-btn--secundario"
            onClick={recargarActiva}
            disabled={cargando}
          >
            <IcRefresh size={16} aria-hidden="true" />
            {cargando ? 'Actualizando…' : 'Actualizar'}
          </button>
        )}
      />

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
          </button>
        ))}
      </div>

      <p className="cat-descripcion">{activa.descripcion}</p>

      {pestana === 'alimentos' && (
        <section className="adm-panel" role="tabpanel" id="panel-alimentos" aria-labelledby="tab-alimentos">
          <div className="cat-panel-head">
            <span className="adm-conteo">{alimentos.tipos.length} en el catálogo</span>
            {puedeGestionar && (
              <button
                type="button"
                className="adm-btn adm-btn--primario"
                onClick={() => setFormAlimento({ abierto: true, editando: null })}
              >
                Nuevo alimento
              </button>
            )}
          </div>

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
              <p>
                Sin tipos de alimento, el registro de consumo diario no puede dejar
                constancia de qué se le dio al lote.
              </p>
            </div>
          ) : (
            <div className="cat-tabla-scroll">
              <table className="cat-tabla">
                <thead>
                  <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col">Marca</th>
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
                      <td><strong>{tipo.nombre}</strong></td>
                      <td>{tipo.marca ? capitalizar(tipo.marca) : '—'}</td>
                      <td>{tipo.etapa ? capitalizar(tipo.etapa) : '—'}</td>
                      <td>{tipo.presentacion ? capitalizar(tipo.presentacion) : '—'}</td>
                      <td>{rangoDeDias(tipo.dia_inicio, tipo.dia_fin)}</td>
                      <td className="cat-num">{gramos(tipo.consumo_total_esperado_g)}</td>
                      <td>
                        <span className={`cat-estado cat-estado--${tipo.activo ? 'activo' : 'retirado'}`}>
                          {tipo.activo ? 'Disponible' : 'Retirado'}
                        </span>
                      </td>
                      {puedeGestionar && (
                        <td className="cat-acciones">
                          <button type="button" className="adm-btn-fila" onClick={() => setFormAlimento({ abierto: true, editando: tipo })}>
                            Editar
                          </button>
                          <button type="button" className="adm-btn-fila" onClick={() => void alimentos.alternar(tipo)}>
                            {tipo.activo ? 'Retirar' : 'Reactivar'}
                          </button>
                          <button type="button" className="adm-btn-fila adm-btn-fila--peligro" onClick={() => borrarAlimento(tipo)}>
                            Eliminar
                          </button>
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
          onRecargar={() => void curvas.recargar()}
        />
      )}

      {pestana === 'sensores' && (
        <section className="adm-panel" role="tabpanel" id="panel-sensores" aria-labelledby="tab-sensores">
          <div className="cat-panel-head">
            <span className="adm-conteo">{sensores.sensores.length} modelos</span>
            {puedeGestionar && (
              <button
                type="button"
                className="adm-btn adm-btn--primario"
                onClick={() => setFormSensor({ abierto: true, editando: null })}
              >
                Nuevo sensor
              </button>
            )}
          </div>

          {sensores.error && (
            <div className="adm-alerta" role="alert">
              <span>{sensores.error}</span>
              <button type="button" onClick={() => void sensores.recargar()}>Reintentar</button>
            </div>
          )}

          {sensores.cargando ? (
            <p className="cat-vacio" role="status">Cargando el catálogo de sensores…</p>
          ) : (
            <div className="cat-tabla-scroll">
              <table className="cat-tabla">
                <thead>
                  <tr>
                    <th scope="col">Tipo</th>
                    <th scope="col">Nombre</th>
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
                      <td><code className="cat-codigo">{sensor.tipo_sensor}</code></td>
                      <td><strong>{sensor.nombre}</strong></td>
                      <td className="cat-desc">{sensor.descripcion || '—'}</td>
                      <td className="cat-num">{pesos(sensor.precio_unitario_cop)}</td>
                      <td className="cat-num">{sensor.cobertura_m2 === null ? '—' : `${sensor.cobertura_m2} m²`}</td>
                      <td>{sensor.obligatorio ? 'Sí' : 'No'}</td>
                      <td>
                        <span className={`cat-estado cat-estado--${sensor.activo ? 'activo' : 'retirado'}`}>
                          {sensor.activo ? 'Disponible' : 'Retirado'}
                        </span>
                      </td>
                      {puedeGestionar && (
                        <td className="cat-acciones">
                          <button type="button" className="adm-btn-fila" onClick={() => setFormSensor({ abierto: true, editando: sensor })}>
                            Editar
                          </button>
                          <button type="button" className="adm-btn-fila" onClick={() => void sensores.alternar(sensor)}>
                            {sensor.activo ? 'Retirar' : 'Reactivar'}
                          </button>
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
