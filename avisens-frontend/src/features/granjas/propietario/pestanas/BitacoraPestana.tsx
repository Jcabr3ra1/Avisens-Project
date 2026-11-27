import { confirmarAccion } from '@shared/ui/ConfirmarAccion/gestorConfirmacion'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import type { Lote } from '@features/lotes/api/lotes'
import { useBitacora } from '@features/bitacora/hooks/useBitacora'
import { subirFotoMortalidad } from '@features/bitacora/api/bitacora'
import FormularioRegistro from '@features/bitacora/components/FormularioRegistro'
import ModalFotoMortalidad from '@features/bitacora/components/ModalFotoMortalidad'
import {
  errorDeRegistro,
  FORMULARIO_INICIAL, formularioDesde, payloadRegistro,
  type FormularioRegistro as DatosRegistro, type TipoRegistro,
} from '@features/bitacora/model/bitacora'
import FormularioConsumo from '@features/consumos-diarios/components/FormularioConsumo'
import { actualizarConsumoDiario, crearConsumoDiario, eliminarConsumoDiario } from '@features/consumos-diarios/api/consumosDiarios'
import { listarTiposAlimento, type TipoAlimento } from '@features/consumos-diarios/api/tipos-alimento'
import { FORMULARIO_CONSUMO_INICIAL, type FormularioConsumo as DatosConsumo } from '@features/consumos-diarios/model/consumoDiario'
import { IcAlert, IcDrop, IcEdit, IcPaperclip, IcPlus, IcScale, IcSeed, IcTrash } from '@shared/ui/icons/icons'
import { mensajeDeError } from '@shared/utils/errores'
import { agruparPorDia, formConsumoDesde, lineaDeTiempo, payloadConsumo, totalesConsumo, type Movimiento, type TipoMovimiento } from '../bitacoraLote'
import { pesoCreible } from '@shared/utils/rangosAvicolas'

type Props = { lote: Lote; vistaInicial?: 'resumen' | 'peso' }
type Filtro = 'todo' | TipoMovimiento

const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

const ACCIONES: { tipo: TipoMovimiento; titulo: string; detalle: string; icono: typeof IcScale }[] = [
  { tipo: 'peso', titulo: 'Pesaje', detalle: 'Peso promedio de una muestra', icono: IcScale },
  { tipo: 'mortalidad', titulo: 'Mortalidad', detalle: 'Aves que murieron hoy', icono: IcAlert },
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
  const [fotoMortalidad, setFotoMortalidad] = useState<File | null>(null)
  const [mortalidadFotoId, setMortalidadFotoId] = useState<number | null>(null)
  const [consumo, setConsumo] = useState<{ id: number | null } | null>(null)
  const [formConsumo, setFormConsumo] = useState<DatosConsumo>(FORMULARIO_CONSUMO_INICIAL)
  const [tiposAlimento, setTiposAlimento] = useState<TipoAlimento[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listarTiposAlimento().then(setTiposAlimento).catch(() => setTiposAlimento([]))
  }, [])

  const movimientos = useMemo(
    () => lineaDeTiempo(lote.id, datos.pesajes, datos.mortalidad, datos.sanitarios, datos.consumos, lote.cantidad_inicial),
    [lote.id, lote.cantidad_inicial, datos.pesajes, datos.mortalidad, datos.sanitarios, datos.consumos],
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
  const { alimentoKg: alimento, aguaLitros: agua, fueraDeRango } = totalesConsumo(consumosLote, lote.cantidad_inicial)
  const avisoFueraDeRango = fueraDeRango > 0
    ? `Sin ${fueraDeRango} ${fueraDeRango === 1 ? 'registro fuera de rango' : 'registros fuera de rango'}`
    : null

  const abrir = useCallback((tipo: TipoMovimiento, id: number | null = null) => {
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
    setFotoMortalidad(null)
    setRegistro({ tipo, id })
  }, [datos, lote.id])

  const yaAbiertoInicial = useRef(false)
  useEffect(() => {
    if (vistaInicial === 'peso' && !yaAbiertoInicial.current) {
      yaAbiertoInicial.current = true
      abrir('peso')
    }
  }, [vistaInicial, abrir])

  function guardarRegistro(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!registro) return
    const problema = errorDeRegistro(registro.tipo, formRegistro)
    if (problema) {
      setError(problema)
      return
    }
    const payload = payloadRegistro(registro.tipo, formRegistro, lote.id)
    setGuardando(true)
    setError('')
    const archivoAdjunto = registro.tipo === 'mortalidad' ? fotoMortalidad : null
    const accion = registro.id === null
      ? datos.crear(registro.tipo, payload)
      : datos.actualizar(registro.tipo, registro.id, payload)
    void accion
      .then(async (guardado) => {
        if (archivoAdjunto && guardado?.id) {
          try {
            const res = await subirFotoMortalidad(guardado.id, archivoAdjunto)
            datos.marcarFotoMortalidad(guardado.id, res.mime_type)
          } catch (falloFoto) {
            toast.error(
              mensajeDeError(falloFoto, 'El registro se guardó, pero no se pudo subir la fotografía.'),
            )
          }
        }
        toast.success(registro.id === null ? 'Registro guardado' : 'Registro corregido')
        setRegistro(null)
        setFotoMortalidad(null)
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

  async function eliminar(movimiento: Movimiento) {
    if (!(await confirmarAccion({
      titulo: '¿Eliminar este registro?',
      entidad: movimiento.titulo,
      descripcion: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar registro',
      tono: 'peligro',
    }))) return
    const accion = movimiento.tipo === 'consumo'
      ? eliminarConsumoDiario(movimiento.id).then(() => datos.recargar())
      : datos.eliminar(movimiento.tipo, movimiento.id)
    void accion
      .then(() => toast.success('Registro eliminado'))
      .catch((fallo) => toast.error(mensajeDeError(fallo, 'No se pudo eliminar el registro.')))
  }

  if (datos.cargando) return <div className="gp-card gp-curva-vacia" role="status">Cargando la bitácora…</div>

  return (
    <div className="gb">
      <section className="adm-kpis" aria-label="Resumen de la bitácora">
        <article className="adm-kpi adm-kpi--primario">
          <span className="adm-kpi-cab">
            <span className="adm-kpi-etiqueta">Último pesaje</span>
            <span className="adm-kpi-icono" aria-hidden="true"><IcScale size={15} /></span>
          </span>
          <strong className="adm-kpi-valor">
            {!pesoUltimo ? '—' : pesoCreible(pesoUltimo.peso_promedio_g) ? `${entero.format(pesoUltimo.peso_promedio_g)} g` : 'Fuera de rango'}
          </strong>
          <span className="adm-kpi-nota">
            {pesoUltimo ? new Date(`${pesoUltimo.fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO') : 'Sin pesajes'}
          </span>
        </article>
        <article className={`adm-kpi adm-kpi--${muertas > 0 ? 'peligro' : 'ok'}`}>
          <span className="adm-kpi-cab">
            <span className="adm-kpi-etiqueta">Mortalidad</span>
            <span className="adm-kpi-icono" aria-hidden="true"><IcAlert size={15} /></span>
          </span>
          <strong className="adm-kpi-valor">
            {entero.format(muertas)} {muertas === 1 ? 'ave' : 'aves'}
          </strong>
          <span className="adm-kpi-nota">
            {decimal.format((muertas / Math.max(lote.cantidad_inicial, 1)) * 100)} % del lote
          </span>
        </article>
        <article className="adm-kpi adm-kpi--ok">
          <span className="adm-kpi-cab">
            <span className="adm-kpi-etiqueta">Alimento</span>
            <span className="adm-kpi-icono" aria-hidden="true"><IcSeed size={15} /></span>
          </span>
          <strong className="adm-kpi-valor">{decimal.format(alimento)} kg</strong>
          <span className="adm-kpi-nota">{avisoFueraDeRango ?? 'Acumulado del lote'}</span>
        </article>
        <article className="adm-kpi adm-kpi--info">
          <span className="adm-kpi-cab">
            <span className="adm-kpi-etiqueta">Agua</span>
            <span className="adm-kpi-icono" aria-hidden="true"><IcDrop size={15} /></span>
          </span>
          <strong className="adm-kpi-valor">{decimal.format(agua)} L</strong>
          <span className="adm-kpi-nota">{avisoFueraDeRango ?? 'Acumulado del lote'}</span>
        </article>
      </section>

      <section className="gp-card gb-bloque" aria-labelledby="gb-registrar">
        <div className="gp-bloque-cabecera">
          <div>
            <span className="gp-rotulo">Nuevo apunte</span>
            <h3 id="gb-registrar" className="gb-titulo">Registrar en la bitácora</h3>
          </div>
        </div>
        <div className="gb-acciones">
          {ACCIONES.map(({ tipo, titulo, detalle, icono: Icono }) => (
            <button key={tipo} type="button" className={`gb-accion gb-accion--${tipo}`} onClick={() => abrir(tipo)}>
              <span className="gb-accion-icono" aria-hidden="true"><Icono size={19} /></span>
              <span className="gb-accion-texto">
                <strong>{titulo}</strong>
                <span>{detalle}</span>
              </span>
              <IcPlus size={15} className="gb-accion-mas" aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      <section className="gp-card gb-historial" aria-labelledby="gb-historial-titulo">
        <div className="gp-bloque-cabecera">
          <div>
            <span className="gp-rotulo">Línea de tiempo</span>
            <h3 id="gb-historial-titulo" className="gb-titulo">Historial del lote</h3>
          </div>
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
                      <li key={movimiento.clave} className={`gb-movimiento gb-movimiento--${movimiento.tipo}${movimiento.fueraDeRango ? ' is-fuera-de-rango' : ''}`}>
                        <span className="gb-movimiento-icono" aria-hidden="true"><Icono size={15} /></span>
                        <span className="gb-movimiento-texto">
                          <strong>{movimiento.titulo}</strong>
                          <span>{movimiento.detalle}</span>
                        </span>
                        <span className="gb-movimiento-acciones">
                          {movimiento.tipo === 'mortalidad' && (
                            <button
                              type="button"
                              className={movimiento.tieneFoto ? 'mort-foto-chip mort-foto-chip--activa' : undefined}
                              onClick={() => setMortalidadFotoId(movimiento.id)}
                              aria-label={`${movimiento.tieneFoto ? 'Ver foto de' : 'Adjuntar foto a'} ${movimiento.titulo}`}
                            >
                              <IcPaperclip size={14} aria-hidden="true" />
                              {movimiento.tieneFoto ? 'Ver foto' : 'Foto'}
                            </button>
                          )}
                          <button type="button" onClick={() => abrir(movimiento.tipo, movimiento.id)} aria-label={`Editar ${movimiento.titulo}`}>
                            <IcEdit size={14} aria-hidden="true" /> Editar
                          </button>
                          <button type="button" className="is-peligro" onClick={() => eliminar(movimiento)} aria-label={`Eliminar ${movimiento.titulo}`}>
                            <IcTrash size={14} aria-hidden="true" />
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
          onCerrar={() => {
            if (guardando) return
            setRegistro(null)
            setFotoMortalidad(null)
          }}
          fotoMortalidad={registro.tipo === 'mortalidad' ? fotoMortalidad : null}
          tieneFotoActual={
            registro.tipo === 'mortalidad' && registro.id !== null
              ? Boolean(datos.mortalidad.find((item) => item.id === registro.id)?.foto_mime_type)
              : false
          }
          onCambiarFotoMortalidad={registro.tipo === 'mortalidad' ? setFotoMortalidad : undefined}
          onErrorFoto={registro.tipo === 'mortalidad' ? setError : undefined}
        />
      )}

      {mortalidadFotoId !== null && (() => {
        const registroFoto = datos.mortalidad.find((item) => item.id === mortalidadFotoId)
        if (!registroFoto) return null
        return (
          <ModalFotoMortalidad
            registro={registroFoto}
            onCerrar={() => setMortalidadFotoId(null)}
            onActualizado={datos.marcarFotoMortalidad}
          />
        )
      })()}

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
