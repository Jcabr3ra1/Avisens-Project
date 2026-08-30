import { useMemo, useState, type FormEvent } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import FormularioConsumo from './FormularioConsumo'
import ResumenConsumos from './ResumenConsumos'
import TablaConsumos from './TablaConsumos'
import { useConsumosDiarios } from '../hooks/useConsumosDiarios'
import {
  FORMULARIO_CONSUMO_INICIAL,
  type ConsumoDiario,
  type CrearConsumoDiarioPayload,
  type FormularioConsumo as DatosFormularioConsumo,
} from '../model/consumoDiario'
import '../ConsumosDiariosPage.css'

type Props = {
  loteFijo?: number | null
  completo?: boolean
}

function GestionConsumos({ loteFijo = null, completo = false }: Props) {
  const gestion = useConsumosDiarios()
  const [abierto, setAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [form, setForm] = useState<DatosFormularioConsumo>(FORMULARIO_CONSUMO_INICIAL)
  const [guardando, setGuardando] = useState(false)
  const [errorFormulario, setErrorFormulario] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [loteFiltro, setLoteFiltro] = useState('todos')
  const base = useMemo(
    () => gestion.consumos.filter((c) => loteFijo === null || c.lote_id === loteFijo),
    [gestion.consumos, loteFijo]
  )
  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es-CO')
    return base.filter(
      (c) =>
        (loteFijo !== null || loteFiltro === 'todos' || String(c.lote_id) === loteFiltro) &&
        (!termino ||
          [c.lote.codigo, c.tipo_alimento?.nombre, c.fecha].some((v) =>
            v?.toLocaleLowerCase('es-CO').includes(termino)
          ))
    )
  }, [base, busqueda, loteFiltro, loteFijo])
  const abrirCrear = () => {
    setForm(
      loteFijo === null
        ? FORMULARIO_CONSUMO_INICIAL
        : { ...FORMULARIO_CONSUMO_INICIAL, lote_id: String(loteFijo) }
    )
    setEditandoId(null)
    setErrorFormulario('')
    setAbierto(true)
  }
  const abrirEditar = (c: ConsumoDiario) => {
    setForm({
      lote_id: String(c.lote_id),
      tipo_alimento_id: c.tipo_alimento_id ? String(c.tipo_alimento_id) : '',
      fecha: c.fecha.slice(0, 10),
      alimento_kg: c.alimento_kg?.toString() ?? '',
      agua_litros: c.agua_litros?.toString() ?? '',
    })
    setEditandoId(c.id)
    setErrorFormulario('')
    setAbierto(true)
  }
  const cambiar = <K extends keyof DatosFormularioConsumo>(
    campo: K,
    valor: DatosFormularioConsumo[K]
  ) => setForm((actual) => ({ ...actual, [campo]: valor }))
  const guardar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const alimento = form.alimento_kg ? Number(form.alimento_kg) : undefined
    const agua = form.agua_litros ? Number(form.agua_litros) : undefined
    if (!alimento && !agua) {
      setErrorFormulario('Registra al menos el alimento o el agua consumida.')
      return
    }
    if (alimento && !form.tipo_alimento_id) {
      setErrorFormulario('Selecciona el tipo de alimento consumido.')
      return
    }
    const datos: CrearConsumoDiarioPayload = {
      lote_id: Number(form.lote_id),
      fecha: form.fecha,
      tipo_alimento_id: form.tipo_alimento_id ? Number(form.tipo_alimento_id) : undefined,
      alimento_kg: alimento,
      agua_litros: agua,
      metodo_registro: 'manual',
    }
    setGuardando(true)
    setErrorFormulario('')
    const accion =
      editandoId === null ? gestion.crear(datos) : gestion.actualizar(editandoId, datos)
    void accion
      .then(() => setAbierto(false))
      .catch((err) => setErrorFormulario(mensajeDeError(err, 'No se pudo guardar el consumo.')))
      .finally(() => setGuardando(false))
  }
  const eliminar = (c: ConsumoDiario) => {
    if (!window.confirm(`¿Eliminar el consumo del lote ${c.lote.codigo}?`)) return
    void gestion.eliminar(c.id).catch(() => undefined)
  }
  const alertaError = gestion.error && (
    <div className="cd-alerta" role="alert">
      <span>{gestion.error}</span>
      <button type="button" onClick={() => void gestion.recargar()}>Reintentar</button>
    </div>
  )
  const contenido = gestion.cargando ? (
    <p className="cd-vacio" role="status">Cargando consumos…</p>
  ) : base.length === 0 ? (
    loteFijo === null ? (
      <div className="cd-vacio">
        <h2>Aún no hay consumos registrados</h2>
        <p>Registra alimento y agua para controlar cada lote.</p>
      </div>
    ) : (
      <div className="cd-vacio">
        <h2>Aún no hay consumos para este lote</h2>
        <p>Usa «+ Registrar consumo» para empezar su seguimiento.</p>
      </div>
    )
  ) : visibles.length === 0 ? (
    <div className="cd-vacio">
      <h2>No hay coincidencias</h2>
      <p>{loteFijo === null ? 'Prueba otra búsqueda o lote.' : 'Prueba otra búsqueda.'}</p>
    </div>
  ) : (
    <TablaConsumos consumos={visibles} onEditar={abrirEditar} onEliminar={eliminar} />
  )
  const modal = abierto && (
    <FormularioConsumo
      form={form}
      lotes={gestion.lotes}
      tiposAlimento={gestion.tiposAlimento}
      modoEdicion={editandoId !== null}
      guardando={guardando}
      error={errorFormulario}
      onCambiar={cambiar}
      onGuardar={guardar}
      onCerrar={() => !guardando && setAbierto(false)}
    />
  )
  if (completo)
    return (
      <div className="page-container cd-page">
        <header className="cd-cabecera">
          <ResumenConsumos consumos={gestion.consumos} />
          <button className="cd-primario" type="button" onClick={abrirCrear}>
            + Registrar consumo
          </button>
        </header>
        {alertaError}
        <section className="cd-listado" aria-label="Historial de consumos">
          <div className="cd-barra">
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por lote, alimento o fecha"
              aria-label="Buscar consumo"
            />
            <select
              value={loteFiltro}
              onChange={(e) => setLoteFiltro(e.target.value)}
              aria-label="Filtrar por lote"
            >
              <option value="todos">Todos los lotes</option>
              {gestion.lotes.map((lote) => (
                <option key={lote.id} value={lote.id}>
                  {lote.codigo}
                </option>
              ))}
            </select>
            <span>
              {visibles.length} de {gestion.consumos.length}
            </span>
          </div>
          {contenido}
        </section>
        {modal}
      </div>
    )
  return (
    <section className="cd-listado" aria-label="Consumos del lote">
      <div className="cd-barra">
        <button className="cd-primario" type="button" onClick={abrirCrear}>
          + Registrar consumo
        </button>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por alimento o fecha"
          aria-label="Buscar consumo"
        />
        <span>
          {visibles.length} de {base.length}
        </span>
      </div>
      {alertaError}
      {contenido}
      {modal}
    </section>
  )
}

export default GestionConsumos
