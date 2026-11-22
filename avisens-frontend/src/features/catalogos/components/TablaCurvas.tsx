import { useMemo, useState } from 'react'
import { IcChevronDown, IcClose, IcEdit, IcTrash } from '@shared/ui/icons/icons'
import type { CurvaObjetivo } from '@features/indicadores/api/curvas-objetivo'
import { capitalizar, etiquetaEtapa, gramos } from '../model/catalogos'

type Props = {
  curvas: CurvaObjetivo[]
  cargando: boolean
  error: string
  puedeGestionar: boolean
  onRecargar: () => void
  onEditar: (curva: CurvaObjetivo) => void
  onEliminar: (curva: CurvaObjetivo) => void
}

function TablaCurvas({
  curvas,
  cargando,
  error,
  puedeGestionar,
  onRecargar,
  onEditar,
  onEliminar,
}: Props) {
  const [marca, setMarca] = useState('todas')
  const [sexo, setSexo] = useState('todos')
  const [origen, setOrigen] = useState<'todos' | 'seed' | 'manual'>('todos')

  const marcas = useMemo(
    () => [...new Set(curvas.map((curva) => curva.marca))].sort(),
    [curvas],
  )
  const sexos = useMemo(
    () => [...new Set(curvas.map((curva) => curva.sexo))].sort(),
    [curvas],
  )

  const visibles = useMemo(() => curvas.filter((curva) => (
    (marca === 'todas' || curva.marca === marca)
    && (sexo === 'todos' || curva.sexo === sexo)
    && (origen === 'todos' || curva.origen === origen)
  )), [curvas, marca, sexo, origen])

  const hayFiltros = marca !== 'todas' || sexo !== 'todos' || origen !== 'todos'

  function limpiar() {
    setMarca('todas')
    setSexo('todos')
    setOrigen('todos')
  }

  return (
    <section className="cat-panel" aria-label="Curvas objetivo">
      <header className="cat-panel-head">
        <div>
          <h2>Curvas objetivo</h2>
          <p>Valores de referencia del fabricante contra los que se compara cada lote día a día.</p>
        </div>
        <div className="cat-panel-acciones">
          <label className="cat-desplegable">
            <span className="sr-only">Filtrar por marca</span>
            <select value={marca} onChange={(evento) => setMarca(evento.target.value)}>
              <option value="todas">Marca: todas</option>
              {marcas.map((item) => (
                <option key={item} value={item}>{capitalizar(item)}</option>
              ))}
            </select>
            <IcChevronDown size={16} aria-hidden="true" />
          </label>
          <label className="cat-desplegable">
            <span className="sr-only">Filtrar por sexo</span>
            <select value={sexo} onChange={(evento) => setSexo(evento.target.value)}>
              <option value="todos">Sexo: todos</option>
              {sexos.map((item) => (
                <option key={item} value={item}>{capitalizar(item)}</option>
              ))}
            </select>
            <IcChevronDown size={16} aria-hidden="true" />
          </label>
          <label className="cat-desplegable">
            <span className="sr-only">Filtrar por origen</span>
            <select value={origen} onChange={(evento) => setOrigen(evento.target.value as 'todos' | 'seed' | 'manual')}>
              <option value="todos">Origen: todos</option>
              <option value="seed">Fabricante</option>
              <option value="manual">Añadidas aquí</option>
            </select>
            <IcChevronDown size={16} aria-hidden="true" />
          </label>
          <span className="cat-conteo">{visibles.length} de {curvas.length}</span>
          {hayFiltros && (
            <button type="button" className="cat-filtro-limpiar" onClick={limpiar}>
              Limpiar <IcClose size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      <p className="cat-aviso">
        <strong>Las curvas del fabricante no se editan:</strong> cada lote se compara contra ellas.
        Las que añades aquí sí se pueden editar o eliminar.
      </p>

      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onRecargar}>Reintentar</button>
        </div>
      )}

      {cargando ? (
        <p className="cat-vacio" role="status">Cargando curvas objetivo…</p>
      ) : curvas.length === 0 ? (
        <div className="cat-vacio">
          <h2>No hay curvas objetivo sembradas</h2>
          <p>Sin ellas, ningún lote puede compararse contra un peso de referencia.</p>
        </div>
      ) : visibles.length === 0 ? (
        <div className="cat-vacio">
          <h2>Sin coincidencias</h2>
          <p>Ningún punto de curva coincide con los filtros actuales.</p>
          <button type="button" className="adm-btn adm-btn--secundario" onClick={limpiar}>Limpiar filtros</button>
        </div>
      ) : (
        <div className="cat-tabla-scroll">
          <table className="cat-tabla cat-tabla--curvas">
            <thead>
              <tr>
                <th scope="col">Marca · sexo</th>
                <th scope="col">Día</th>
                <th scope="col">Peso esperado</th>
                <th scope="col">Consumo acumulado</th>
                <th scope="col">FCR</th>
                <th scope="col">Etapa</th>
                <th scope="col">Temperatura</th>
                <th scope="col">Origen</th>
                {puedeGestionar && <th scope="col"><span className="sr-only">Acciones</span></th>}
              </tr>
            </thead>
            <tbody>
              {visibles.map((curva) => (
                <tr key={curva.id}>
                  <td>
                    <span className="cat-celda-texto">
                      <strong>{capitalizar(curva.marca)}</strong>
                      <span>{capitalizar(curva.sexo)}</span>
                    </span>
                  </td>
                  <td className="cat-num"><strong>{curva.dia}</strong></td>
                  <td className="cat-num">{gramos(curva.peso_esperado_g)}</td>
                  <td className="cat-num">
                    <span className="cat-celda-texto cat-celda-texto--centro">
                      <strong>{gramos(curva.consumo_acumulado_g)}</strong>
                      <span>{curva.consumo_diario_g === null ? 'Diario sin dato' : `${gramos(curva.consumo_diario_g)} al día`}</span>
                    </span>
                  </td>
                  <td className="cat-num">{curva.fcr_objetivo ?? '—'}</td>
                  <td><span className="cat-chip">{curva.etapa_alimentacion ? etiquetaEtapa(curva.etapa_alimentacion) : '—'}</span></td>
                  <td className="cat-num">
                    {curva.temperatura_min === null && curva.temperatura_max === null
                      ? '—'
                      : curva.temperatura_min === curva.temperatura_max
                        ? `${curva.temperatura_min} °C`
                        : `${curva.temperatura_min ?? '?'}–${curva.temperatura_max ?? '?'} °C`}
                  </td>
                  <td>
                    <span className={`cat-origen cat-origen--${curva.origen}`}>
                      {curva.origen === 'seed' ? 'Fabricante' : 'Añadida'}
                    </span>
                  </td>
                  {puedeGestionar && (
                    <td>
                      {curva.origen === 'manual' ? (
                        <div className="cat-acciones">
                          <button
                            type="button"
                            className="cat-btn-icono"
                            onClick={() => onEditar(curva)}
                            aria-label={`Editar punto día ${curva.dia}`}
                            title="Editar"
                          >
                            <IcEdit size={14} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="cat-btn-icono cat-btn-icono--peligro"
                            onClick={() => onEliminar(curva)}
                            aria-label={`Eliminar punto día ${curva.dia}`}
                            title="Eliminar"
                          >
                            <IcTrash size={14} aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <span className="cat-protegida">Protegida</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default TablaCurvas
