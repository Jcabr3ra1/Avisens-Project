import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import type { Lote } from '@features/lotes/api/lotes'
import { useBitacora } from '@features/bitacora/hooks/useBitacora'
import FormularioRegistro from '@features/bitacora/components/FormularioRegistro'
import AlimentoEstimadoPesaje from '@features/bitacora/components/AlimentoEstimadoPesaje'
import {
  FORMULARIO_INICIAL, formularioDesde, payloadRegistro,
  type FormularioRegistro as DatosRegistro, type TipoRegistro,
} from '@features/bitacora/model/bitacora'
import FormularioConsumo from '@features/consumos-diarios/components/FormularioConsumo'
import { actualizarConsumoDiario, crearConsumoDiario, eliminarConsumoDiario } from '@features/consumos-diarios/api/consumosDiarios'
import { listarTiposAlimento, type TipoAlimento } from '@features/consumos-diarios/api/tipos-alimento'
import { FORMULARIO_CONSUMO_INICIAL, type FormularioConsumo as DatosConsumo } from '@features/consumos-diarios/model/consumoDiario'
import { IcDrop, IcEdit, IcHeart, IcScale, IcSeed, IcTrash } from '@shared/ui/icons/icons'
import { mensajeDeError } from '@shared/utils/errores'
import { agruparPorDia, formConsumoDesde, lineaDeTiempo, payloadConsumo, type Movimiento, type TipoMovimiento } from '../bitacoraLote'

type Props = { lote: Lote; vistaInicial?: 'resumen' | 'peso' }
type Filtro = 'todo' | TipoMovimiento

const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

const ACCIONES: { tipo: TipoMovimiento; titulo: string; detalle: string; icono: typeof IcScale }[] = [
  { tipo: 'peso', titulo: 'Pesaje', detalle: 'Peso promedio de una muestra', icono: IcScale },
  { tipo: 'mortalidad', titulo: 'Mortalidad', detalle: 'Aves que murieron hoy', icono: IcHeart },
  { tipo: 'sanitario', titulo: 'Sanidad', detalle: 'Vacunas y tratamientos', icono: IcDrop },
  { tipo: 'consumo', titulo: 'Consumo', detalle: 'Alimento y agua del día', icono: IcSeed },
]

const FILTROS: { valor: Filtro; etiqueta: string }[] = [
  { valor: 'todo', etiqueta: 'Todo' },
  { valor: 'peso', etiqueta: 'Pesajes' },
  { valor: 'mortalidad', etiqueta: 'Mortalidad' },
  { valor: 'sanitario', etiqueta: 'Sanidad' },
  { valor: 'consumo', etiqueta: 'Consumos' },
]

function BitacoraPestana({ lote, vistaInicial = 'resumen' }: Props) {
  const datos = useBitacora()
  const [filtro, setFiltro] = useState<Filtro>(vistaInicial === 'peso' ? 'peso' : 'todo')
  const [registro, setRegistro] = useState<{ tipo: TipoRegistro; id: number | null } | null>(null)
  const [formRegistro, setFormRegistro] = useState<DatosRegistro>(FORMULARIO_INICIAL)
  const [consumo, setConsumo] = useState<{ id: number | null } | null>(null)
  const [formConsumo, setFormConsumo] = useState<DatosConsumo>(FORMULARIO_CONSUMO_INICIAL)
  const [tiposAlimento, setTiposAlimento] = useState<TipoAlimento[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listarTiposAlimento().then(setTiposAlimento).catch(() => setTiposAlimento([]))
  }, [])

  const movimientos = useMemo(
    () => lineaDeTiempo(lote.id, datos.pesajes, datos.mortalidad, datos.sanitarios, datos.consumos),
    [lote.id, datos.pesajes, datos.mortalidad, datos.sanitarios, datos.consumos],
  )
  const conteo = (tipo: Filtro) => (tipo === 'todo' ? movimientos.length : movimientos.filter((m) => m.tipo === tipo).length)
  const dias = useMemo(
    () => agruparPorDia(filtro === 'todo' ? movimientos : movimientos.filter((m) => m.tipo === filtro)),
    [movimientos, filtro],
  )
  const ultimoPeso = movimientos.find((m) => m.tipo === 'peso')
  const pesoUltimo = ultimoPeso ? datos.pesajes.find((p) => p.id === ultimoPeso.id) : undefined
  const muertas = datos.mortalidad.filter((m) => m.lote_id === lote.id).reduce((t, m) => t + m.cantidad_aves, 0)
  const consumosLote = datos.consumos.filter((c) => c.lote_id === lote.id)
  const alimento = consumosLote.reduce((t, c) => t + Number(c.alimento_kg ?? 0), 0)
  const agua = consumosLote.reduce((t, c) => t + Number(c.agua_litros ?? 0), 0)

  function abrir(tipo: TipoMovimiento, id: number | null = null) {
    setError('')
    if (tipo === 'consumo') {
      const actual = id === null ? undefined : datos.consumos.find((c) => c.id === id)
      setFormConsumo(actual ? formConsumoDesde(actual) : { ...FORMULARIO_CONSUMO_INICIAL, lote_id: String(lote.id) })
      setConsumo({ id })
      return
    }
    const lista = tipo === 'peso' ? datos.pesajes : tipo === 'mortalidad' ? datos.mortalidad : datos.sanitarios
    const actual = id === null ? undefined : lista.find((item) => item.id === id)
    setFormRegistro(actual ? formularioDesde(tipo, actual) : FORMULARIO_INICIAL)
    setRegistro({ tipo, id })
  }

  function guardarRegistro(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!registro) return
    const payload = payloadRegistro(registro.tipo, formRegistro, lote.id)
    setGuardando(true)
    setError('')
    const accion = registro.id === null
      ? datos.crear(registro.tipo, payload)
      : datos.actualizar(registro.tipo, registro.id, payload)
    void accion
      .then(() => {
        toast.success(registro.id === null ? 'Registro guardado' : 'Registro corregido')
        setRegistro(null)
      })
      .catch((fallo) => setError(mensajeDeError(fallo, 'No se pudo guardar el registro.')))
      .finally(() => setGuardando(false))
  }

  function guardarConsumo(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!consumo) return
    const { payload, error: problema } = payloadConsumo(formConsumo, lote.id)
    if (!payload) {
      setError(problema)
      return
    }
    setGuardando(true)
    setError('')
    const accion = consumo.id === null ? crearConsumoDiario(payload) : actualizarConsumoDiario(consumo.id, payload)
    void accion
      .then(() => datos.recargar())
      .then(() => {
        toast.success(consumo.id === null ? 'Consumo registrado' : 'Consumo corregido')
        setConsumo(null)
      })
      .catch((fallo) => setError(mensajeDeError(fallo, 'No se pudo guardar el consumo.')))
      .finally(() => setGuardando(false))
  }

  function eliminar(movimiento: Movimiento) {
    if (!window.confirm(`¿Eliminar «${movimiento.titulo}»? Esta acción no se puede deshacer.`)) return
    const accion = movimiento.tipo === 'consumo'
      ? eliminarConsumoDiario(movimiento.id).then(() => datos.recargar())
      : datos.eliminar(movimiento.tipo, movimiento.id)
    void accion
      .then(() => toast.success('Registro eliminado'))
      .catch((fallo) => toast.error(mensajeDeError(fallo, 'No se pudo eliminar el registro.')))
  }

  if (datos.cargando) return <div className="gp-curva-vacia" role="status">Cargando la bitácora…</div>

  return (
    <div className="gb">
      <dl className="gp-cifras">
        <div className="gp-cifra">
          <dt>Último pesaje</dt>
          <dd>{pesoUltimo ? `${entero.format(pesoUltimo.peso_promedio_g)} g` : '—'}</dd>
          {pesoUltimo && <dd className="gp-cifra-detalle">{new Date(`${pesoUltimo.fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO')}</dd>}
        </div>
        <div className="gp-cifra">
          <dt>Mortalidad</dt>
          <dd>{entero.format(muertas)} {muertas === 1 ? 'ave' : 'aves'}</dd>
          <dd className="gp-cifra-detalle">{decimal.format((muertas / Math.max(lote.cantidad_inicial, 1)) * 100)} % del lote</dd>
        </div>
        <div className="gp-cifra">
          <dt>Alimento</dt>
          <dd>{decimal.format(alimento)} kg</dd>
        </div>
        <div className="gp-cifra">
          <dt>Agua</dt>
          <dd>{decimal.format(agua)} L</dd>
        </div>
      </dl>

      <section aria-labelledby="gb-registrar">
        <h3 id="gb-registrar" className="gb-titulo">Registrar</h3>
        <div className="gb-acciones">
          {ACCIONES.map(({ tipo, titulo, detalle, icono: Icono }) => (
            <button key={tipo} type="button" className={`gb-accion gb-accion--${tipo}`} onClick={() => abrir(tipo)}>
              <span className="gb-accion-icono" aria-hidden="true"><Icono size={20} /></span>
              <span className="gb-accion-texto">
                <strong>{titulo}</strong>
                <span>{detalle}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="gb-historial" aria-labelledby="gb-historial-titulo">
        <div className="gp-bloque-cabecera">
          <h3 id="gb-historial-titulo" className="gb-titulo">Historial del lote</h3>
          <div className="gb-filtros" role="group" aria-label="Filtrar registros">
            {FILTROS.map(({ valor, etiqueta }) => (
              <button
                key={valor}
                type="button"
                className={`gb-filtro${filtro === valor ? ' is-activo' : ''}`}
                aria-pressed={filtro === valor}
                onClick={() => setFiltro(valor)}
              >
                {etiqueta} <span>{conteo(valor)}</span>
              </button>
            ))}
          </div>
        </div>

        {dias.length === 0 ? (
          <div className="gp-curva-vacia">
            {movimientos.length === 0 ? 'Aún no hay registros en este lote. Empieza con el pesaje o el consumo de hoy.' : 'No hay registros de este tipo.'}
          </div>
        ) : (
          <ol className="gb-dias">
            {dias.map((dia) => (
              <li key={dia.fecha} className="gb-dia">
                <span className="gb-dia-etiqueta">{dia.etiqueta}</span>
                <ul className="gb-movimientos">
                  {dia.movimientos.map((movimiento) => {
                    const Icono = ACCIONES.find((accion) => accion.tipo === movimiento.tipo)?.icono ?? IcScale
                    return (
                      <li key={movimiento.clave} className={`gb-movimiento gb-movimiento--${movimiento.tipo}`}>
                        <span className="gb-movimiento-icono" aria-hidden="true"><Icono size={16} /></span>
                        <span className="gb-movimiento-texto">
                          <strong>{movimiento.titulo}</strong>
                          <span>{movimiento.detalle}</span>
                        </span>
                        <span className="gb-movimiento-acciones">
                          <button type="button" onClick={() => abrir(movimiento.tipo, movimiento.id)} aria-label={`Editar ${movimiento.titulo}`}>
                            <IcEdit size={15} aria-hidden="true" /> Editar
                          </button>
                          <button type="button" className="is-peligro" onClick={() => eliminar(movimiento)} aria-label={`Eliminar ${movimiento.titulo}`}>
                            <IcTrash size={15} aria-hidden="true" />
                          </button>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>

      {registro && (
        <FormularioRegistro
          tipo={registro.tipo}
          form={formRegistro}
          guardando={guardando}
          error={error}
          editando={registro.id !== null}
          onCambiar={(campo, valor) => setFormRegistro((actual) => ({ ...actual, [campo]: valor }))}
          onGuardar={guardarRegistro}
          onCerrar={() => !guardando && setRegistro(null)}
          complemento={registro.tipo === 'peso' ? <AlimentoEstimadoPesaje loteId={lote.id} /> : undefined}
        />
      )}

      {consumo && (
        <FormularioConsumo
          form={formConsumo}
          lotes={[lote]}
          tiposAlimento={tiposAlimento}
          modoEdicion={consumo.id !== null}
          guardando={guardando}
          error={error}
          onCambiar={(campo, valor) => setFormConsumo((actual) => ({ ...actual, [campo]: valor }))}
          onGuardar={guardarConsumo}
          onCerrar={() => !guardando && setConsumo(null)}
        />
      )}
    </div>
  )
}

export default BitacoraPestana
