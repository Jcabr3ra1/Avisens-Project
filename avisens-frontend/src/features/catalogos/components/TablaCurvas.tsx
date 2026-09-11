import { useMemo, useState } from 'react'
import type { CurvaObjetivo } from '@features/indicadores/api/curvas-objetivo'
import { capitalizar, gramos } from '../model/catalogos'

type Props = {
  curvas: CurvaObjetivo[]
  cargando: boolean
  error: string
  puedeGestionar: boolean
  onRecargar: () => void
  onCrear: () => void
  onEditar: (curva: CurvaObjetivo) => void
  onEliminar: (curva: CurvaObjetivo) => void
}

function TablaCurvas({
  curvas, cargando, error, puedeGestionar,
  onRecargar, onCrear, onEditar, onEliminar,
}: Props) {
  const [marca, setMarca] = useState('todas')
  const [sexo, setSexo] = useState('todos')

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
  )), [curvas, marca, sexo])

  return (
    <section className="adm-panel" role="tabpanel" id="panel-curvas" aria-labelledby="tab-curvas">
      <div className="cat-aviso">
        <strong>Las curvas del manual no se editan.</strong> El peso y el consumo de
        cada lote se comparan contra ellas, así que cambiar el objetivo del día 21
        de Italcol alteraría el resultado de todos los lotes de esa marca. El
        servidor las protege: editarlas devuelve un error.
        <br />
        Las que se crean aquí sí se pueden corregir y borrar — sirven para marcas
        que todavía no tienen curva sembrada.
      </div>

      <div className="cat-panel-head">
        <div className="cat-filtros">
          <label className="cat-filtro">
            <span>Marca</span>
            <select value={marca} onChange={(evento) => setMarca(evento.target.value)}>
              <option value="todas">Todas</option>
              {marcas.map((item) => (
                <option key={item} value={item}>{capitalizar(item)}</option>
              ))}
            </select>
          </label>
          <label className="cat-filtro">
            <span>Sexo</span>
            <select value={sexo} onChange={(evento) => setSexo(evento.target.value)}>
              <option value="todos">Todos</option>
              {sexos.map((item) => (
                <option key={item} value={item}>{capitalizar(item)}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="cat-panel-head-derecha">
          <span className="adm-conteo">
            {visibles.length === curvas.length
              ? `${curvas.length} puntos`
              : `${visibles.length} de ${curvas.length} puntos`}
          </span>
          {puedeGestionar && (
            <button type="button" className="adm-btn adm-btn--primario" onClick={onCrear}>
              Nuevo punto
            </button>
          )}
        </div>
      </div>

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
      ) : (
        <div className="cat-tabla-scroll">
          <table className="cat-tabla">
            <thead>
              <tr>
                <th scope="col">Marca</th>
                <th scope="col">Sexo</th>
                <th scope="col">Día</th>
                <th scope="col">Peso esperado</th>
                <th scope="col">Consumo diario</th>
                <th scope="col">Consumo acumulado</th>
                <th scope="col">FCR objetivo</th>
                <th scope="col">Etapa</th>
                <th scope="col">Temperatura</th>
                <th scope="col">Origen</th>
                {puedeGestionar && <th scope="col"><span className="sr-only">Acciones</span></th>}
              </tr>
            </thead>
            <tbody>
              {visibles.map((curva) => (
                <tr key={curva.id}>
                  <td>{capitalizar(curva.marca)}</td>
                  <td>{capitalizar(curva.sexo)}</td>
                  <td className="cat-num"><strong>{curva.dia}</strong></td>
                  <td className="cat-num">{gramos(curva.peso_esperado_g)}</td>
                  <td className="cat-num">{gramos(curva.consumo_diario_g)}</td>
                  <td className="cat-num">{gramos(curva.consumo_acumulado_g)}</td>
                  <td className="cat-num">{curva.fcr_objetivo ?? '—'}</td>
                  <td>{curva.etapa_alimentacion ? capitalizar(curva.etapa_alimentacion) : '—'}</td>
                  <td className="cat-num">
                    {curva.temperatura_min === null && curva.temperatura_max === null
                      ? '—'
                      : `${curva.temperatura_min ?? '?'} – ${curva.temperatura_max ?? '?'} °C`}
                  </td>
                  <td>
                    <span className={`cat-origen cat-origen--${curva.origen}`}>
                      {curva.origen === 'seed' ? 'Manual del fabricante' : 'Añadida aquí'}
                    </span>
                  </td>
                  {puedeGestionar && (
                    <td className="cat-acciones">
                      {/* Sin botones en las del manual: el servidor las rechaza
                          con un 403, así que ofrecerlos sería prometer algo que
                          va a fallar. */}
                      {curva.origen === 'manual' ? (
                        <>
                          <button type="button" className="adm-btn-fila" onClick={() => onEditar(curva)}>
                            Editar
                          </button>
                          <button type="button" className="adm-btn-fila adm-btn-fila--peligro" onClick={() => onEliminar(curva)}>
                            Eliminar
                          </button>
                        </>
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
