import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  eliminarFotoGalpon,
  obtenerFotoGalpon,
  subirFotoGalpon,
} from '@features/galpones/api/galpones'
import type { Lote } from '@features/lotes/api/lotes'
import {
  IcAlert,
  IcArrowRight,
  IcBarn,
  IcDoc,
  IcEdit,
  IcEgg,
  IcGrid,
  IcPaperclip,
  IcPin,
  IcThermo,
  IcTrash,
} from '@shared/ui/icons/icons'
import { validarArchivoFoto } from '@shared/utils/fotos'
import { mensajeDeError } from '@shared/utils/errores'
import { useRefetchOnFocus } from '@shared/hooks/useRefetchOnFocus'
import { getRol } from '@shared/api'
import { permisosOperativosDeGalpon, puedeCompletarDatos } from '@shared/auth/permisos'
import type { Granja } from '../api/granjas'
import EsqueletoGranjas from '../components/EsqueletoGranjas'
import { ModalDatosGranja, ModalDatosLote } from '../components/ModalesDatos'
import { useEstructuraGranjas } from '../hooks/useEstructuraGranjas'
import { useIndicadoresDeLotes } from '../hooks/useIndicadoresDeLotes'
import { avesActuales, diasDeVida } from '../model/estructura'
import {
  lotesActivosDeGalpon,
  pesajesDelLote,
  proximoPaso,
  sensoresReportando,
  tarjetaGalpon,
  type DestinoPaso,
} from './explorador'
import { useCurvaLote } from './useCurvaLote'
import fotoGranjaReal from './assets/ficha-granja-real.webp'
import ResumenPestana from './pestanas/ResumenPestana'
import LotesPestana from './pestanas/LotesPestana'
import AmbientePestana from './pestanas/AmbientePestana'
import { ActuadoresGalpon } from '@features/monitoreo/components/ActuadoresGalpon'
import UmbralesPestana from './pestanas/UmbralesPestana'
import DatosPestana from './pestanas/DatosPestana'
import BitacoraPestana from './pestanas/BitacoraPestana'
import '@shared/ui/admin/AdminKit.css'
import '@shared/ui/movimiento.css'
import './GranjasPropietario.css'

const cargarAlertas = () => import('@features/alertas/AlertasPage')
const AlertasPage = lazy(cargarAlertas)

type PestanaPrincipal = 'resumen' | 'lotes' | 'bitacora' | 'ambiente' | 'alertas' | 'datos'
type SubPestanaAmbiente = 'sensores' | 'clima' | 'actuadores' | 'umbrales'

const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

function resolverPestana(parametro: string | null, subParam: string | null): {
  principal: PestanaPrincipal
  subAmbiente: SubPestanaAmbiente
} {
  if (parametro === 'lotes' || parametro === 'lote') return { principal: 'lotes', subAmbiente: 'sensores' }
  if (parametro === 'bitacora') return { principal: 'bitacora', subAmbiente: 'sensores' }
  if (parametro === 'alertas') return { principal: 'alertas', subAmbiente: 'sensores' }
  if (parametro === 'datos' || parametro === 'equipos') return { principal: 'datos', subAmbiente: 'sensores' }
  if (parametro === 'actuadores') return { principal: 'ambiente', subAmbiente: 'actuadores' }
  if (parametro === 'umbrales') return { principal: 'ambiente', subAmbiente: 'umbrales' }
  if (parametro === 'ambiente') {
    const sub: SubPestanaAmbiente =
      subParam === 'clima' || subParam === 'actuadores' || subParam === 'umbrales'
        ? subParam
        : 'sensores'
    return { principal: 'ambiente', subAmbiente: sub }
  }
  return { principal: 'resumen', subAmbiente: 'sensores' }
}

function CargandoPestana() {
  return <div className="gp-card gp-curva-vacia" role="status">Cargando…</div>
}

type DatosAbiertos =
  | { tipo: 'granja'; granja: Granja }
  | { tipo: 'lote'; lote: Lote }
  | null

function GalponDetallePropietarioPage() {
  const { id } = useParams()
  const galponId = Number(id)
  const navigate = useNavigate()
  const [parametros, setParametros] = useSearchParams()
  const { estructura, lineasGeneticas, consumoPorLote, cargando, error, recargar } = useEstructuraGranjas()

  const { principal: pestana, subAmbiente } = resolverPestana(
    parametros.get('pestana'),
    parametros.get('sub'),
  )
  const vistaBitacora: 'resumen' | 'peso' = parametros.get('vista') === 'peso' ? 'peso' : 'resumen'
  const [revision, setRevision] = useState(0)
  const [datos, setDatos] = useState<DatosAbiertos>(null)

  const encontrado = useMemo(() => {
    for (const item of estructura) {
      const galpon = item.galpones.find((g) => g.id === galponId)
      if (galpon) return { granjaEstructura: item, galpon }
    }
    return null
  }, [estructura, galponId])

  const galpon = encontrado?.galpon ?? null
  const granjaEstructura = encontrado?.granjaEstructura ?? null
  const galponesDeGranja = useMemo(
    () => [...(granjaEstructura?.galpones ?? [])].sort((a, b) => Number(b.activo) - Number(a.activo)),
    [granjaEstructura],
  )

  const lotesActivos = useMemo(() => (galpon ? lotesActivosDeGalpon(galpon) : []), [galpon])
  const loteParam = Number(parametros.get('lote'))
  const loteSeleccionado = useMemo(
    () => lotesActivos.find((item) => item.id === loteParam) ?? lotesActivos[0] ?? null,
    [lotesActivos, loteParam],
  )

  const curvaLote = useCurvaLote(loteSeleccionado?.id ?? null, revision)
  const loteIds = useMemo(() => lotesActivos.map((item) => item.id), [lotesActivos])
  const { porLote } = useIndicadoresDeLotes(loteIds)
  const indicadoresPorLote = useMemo(() => {
    const mapa = new Map<number, ReturnType<typeof porLote.get> extends infer R ? (R extends { ultimo: infer U } ? U : null) : null>()
    for (const item of lotesActivos) {
      mapa.set(item.id, porLote.get(item.id)?.ultimo ?? null)
    }
    return mapa
  }, [lotesActivos, porLote])
  const indicador = loteSeleccionado ? indicadoresPorLote.get(loteSeleccionado.id) ?? null : null

  useEffect(() => {
    void cargarAlertas()
  }, [])

  async function recargarTodo() {
    await recargar()
    setRevision((valor) => valor + 1)
  }

  useRefetchOnFocus(recargarTodo)

  function cambiarPestana(
    nueva: PestanaPrincipal,
    opciones?: { sub?: SubPestanaAmbiente; vista?: 'resumen' | 'peso'; loteId?: number },
  ) {
    const siguiente = new URLSearchParams(parametros)
    if (nueva === 'resumen') siguiente.delete('pestana')
    else siguiente.set('pestana', nueva)

    if (nueva === 'ambiente' && opciones?.sub && opciones.sub !== 'sensores') {
      siguiente.set('sub', opciones.sub)
    } else {
      siguiente.delete('sub')
    }

    if (nueva === 'bitacora' && opciones?.vista) {
      siguiente.set('vista', opciones.vista)
    } else if (nueva !== 'bitacora') {
      siguiente.delete('vista')
    }

    if (opciones?.loteId !== undefined) {
      siguiente.set('lote', String(opciones.loteId))
    }

    setParametros(siguiente, { replace: true })
  }

  function seleccionarLote(loteId: number) {
    const siguiente = new URLSearchParams(parametros)
    siguiente.set('lote', String(loteId))
    setParametros(siguiente, { replace: true })
  }

  function irA(ruta: string) {
    if (ruta.startsWith('/bitacora')) {
      const matchLote = /[?&]lote=(\d+)/.exec(ruta)
      cambiarPestana('bitacora', {
        vista: ruta.includes('vista=peso') ? 'peso' : 'resumen',
        loteId: matchLote ? Number(matchLote[1]) : undefined,
      })
    } else if (ruta.startsWith('/alertas')) {
      cambiarPestana('alertas')
    } else if (ruta.startsWith('/monitoreo/actuadores')) {
      cambiarPestana('ambiente', { sub: 'actuadores' })
    } else if (ruta.startsWith('/monitoreo')) {
      cambiarPestana('ambiente', { sub: 'sensores' })
    } else {
      navigate(ruta)
    }
  }

  const [urlFotoGalpon, setUrlFotoGalpon] = useState<string | null>(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const inputFotoGalponRef = useRef<HTMLInputElement>(null)
  const galponActualId = galpon?.id ?? null

  useEffect(() => {
    if (!galponActualId) {
      setUrlFotoGalpon((anterior) => {
        if (anterior) URL.revokeObjectURL(anterior)
        return null
      })
      return
    }
    let vigente = true
    void obtenerFotoGalpon(galponActualId)
      .then((blob) => {
        if (!vigente) return
        const url = URL.createObjectURL(blob)
        setUrlFotoGalpon((anterior) => {
          if (anterior) URL.revokeObjectURL(anterior)
          return url
        })
      })
      .catch(() => {
        if (vigente) {
          setUrlFotoGalpon((anterior) => {
            if (anterior) URL.revokeObjectURL(anterior)
            return null
          })
        }
      })
    return () => {
      vigente = false
    }
  }, [galponActualId])

  useEffect(() => () => {
    if (urlFotoGalpon) URL.revokeObjectURL(urlFotoGalpon)
  }, [urlFotoGalpon])

  function irADestino(destino: DestinoPaso) {
    if (destino.tipo === 'datos-lote') setDatos({ tipo: 'lote', lote: destino.lote })
    else if (destino.tipo === 'ruta') irA(destino.ruta)
  }

  if (cargando && estructura.length === 0) {
    return <div className="page-container gp-page"><EsqueletoGranjas /></div>
  }

  if (!galpon || !granjaEstructura) {
    return (
      <div className="page-container gp-page adm-page">
        <nav className="gp-miga" aria-label="Navegación">
          <Link to="/granjas" className="gp-volver-pill">
            <IcArrowRight size={15} className="gp-volver-pill-icono" aria-hidden="true" />
            <span>Volver a granjas</span>
          </Link>
        </nav>
        {error && (
          <div className="adm-alerta" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => void recargarTodo()}>Reintentar</button>
          </div>
        )}
        <div className="gp-vacio">
          <IcBarn size={28} aria-hidden="true" />
          <h1>Galpón no encontrado</h1>
          <p>Es posible que este galpón no exista o no esté asignado a tu cuenta.</p>
          <Link to="/granjas" className="adm-btn adm-btn--primario">Volver a granjas</Link>
        </div>
      </div>
    )
  }

  const { granja } = granjaEstructura
  const tarjeta = tarjetaGalpon(galpon)
  const sensores = sensoresReportando(galpon)
  const paso = proximoPaso(galpon, indicador, pesajesDelLote(curvaLote))
  const puedeEditar = puedeCompletarDatos(getRol())
  const lote = loteSeleccionado

  async function cambiarFotoGalpon(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!archivo || !galponActualId) return
    const problema = validarArchivoFoto(archivo)
    if (problema) {
      toast.error(problema)
      return
    }
    setSubiendoFoto(true)
    try {
      await subirFotoGalpon(galponActualId, archivo)
      const urlLocal = URL.createObjectURL(archivo)
      setUrlFotoGalpon((anterior) => {
        if (anterior) URL.revokeObjectURL(anterior)
        return urlLocal
      })
      toast.success('Fotografía del galpón actualizada')
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo subir la fotografía del galpón.'))
    } finally {
      setSubiendoFoto(false)
    }
  }

  async function quitarFotoGalpon() {
    if (!galponActualId) return
    setSubiendoFoto(true)
    try {
      await eliminarFotoGalpon(galponActualId)
      setUrlFotoGalpon((anterior) => {
        if (anterior) URL.revokeObjectURL(anterior)
        return null
      })
      toast.success('Fotografía personalizada eliminada')
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo eliminar la fotografía del galpón.'))
    } finally {
      setSubiendoFoto(false)
    }
  }
  const vivasTotal = lotesActivos.reduce((suma, item) => {
    const ind = indicadoresPorLote.get(item.id) ?? null
    return suma + avesActuales(item.cantidad_inicial, ind?.mortalidadAcumuladaPct ?? null)
  }, 0)

  return (
    <div className="page-container gp-page gp-ficha-pagina adm-page">
      <nav className="gp-miga" aria-label="Navegación">
        <Link to={`/granjas?granjaId=${granja.id}`} className="gp-volver-pill">
          <IcArrowRight size={15} className="gp-volver-pill-icono" aria-hidden="true" />
          <span>Volver a granjas</span>
        </Link>
      </nav>

      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void recargarTodo()}>Reintentar</button>
        </div>
      )}

      <div className="gp-expediente">
        {/* ── Columna izquierda fija: Tarjeta de perfil (estilo /organizaciones/:id) ── */}
        <aside className="gp-perfil" aria-label={`Perfil de ${galpon.nombre}`}>
          <div className="gp-perfil-portada">
            <img src={urlFotoGalpon ?? fotoGranjaReal} alt="" aria-hidden="true" />
            <div className="gp-perfil-portada-badges">
              <span className={`gp-perfil-estado gp-perfil-estado--${tarjeta.estado}`}>
                <span className="gp-perfil-estado-punto" aria-hidden="true" />
                {tarjeta.etiquetaEstado}
              </span>
              <span className="gp-perfil-codigo">{galpon.codigo}</span>
            </div>
            {puedeEditar && (
              <div className="gp-portada-foto-acciones">
                <input
                  ref={inputFotoGalponRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="gp-input-oculto"
                  onChange={(e) => void cambiarFotoGalpon(e)}
                />
                <button
                  type="button"
                  className="gp-portada-foto-btn"
                  onClick={() => inputFotoGalponRef.current?.click()}
                  disabled={subiendoFoto}
                >
                  <IcPaperclip size={13} aria-hidden="true" />
                  {subiendoFoto ? 'Subiendo…' : 'Cambiar foto'}
                </button>
                {urlFotoGalpon && (
                  <button
                    type="button"
                    className="gp-portada-foto-btn gp-portada-foto-btn--borrar"
                    onClick={() => void quitarFotoGalpon()}
                    disabled={subiendoFoto}
                    aria-label="Restaurar fotografía por defecto"
                  >
                    <IcTrash size={13} aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="gp-perfil-cuerpo">
            <span className="gp-perfil-eyebrow">Galpón</span>
            <h1 className="gp-perfil-titulo">{galpon.nombre}</h1>

            <dl className="gp-perfil-datos">
              <div>
                <dt>Granja</dt>
                <dd>{granja.nombre}</dd>
              </div>
              <div>
                <dt>{lotesActivos.length > 1 ? 'Lotes activos' : 'Lote activo'}</dt>
                <dd>
                  {lotesActivos.length === 0
                    ? 'Sin lote'
                    : lotesActivos.length === 1
                      ? lotesActivos[0].codigo
                      : `${lotesActivos.length} en curso`}
                </dd>
              </div>
            </dl>

            <ul className="gp-perfil-metricas" aria-label="Resumen del galpón">
              <li>
                <strong>
                  {lotesActivos.length > 1
                    ? lotesActivos.length
                    : lote
                      ? diasDeVida(lote.fecha_ingreso)
                      : '—'}
                </strong>
                <span>{lotesActivos.length > 1 ? 'Lotes activos' : 'Día de vida'}</span>
              </li>
              <li>
                <strong>{lotesActivos.length > 0 ? entero.format(vivasTotal) : '—'}</strong>
                <span>Aves vivas</span>
              </li>
              <li>
                <strong>{tarjeta.temperatura ?? '—'}</strong>
                <span>Temperatura</span>
              </li>
              <li>
                <strong>
                  {sensores.total === 0 ? '0' : `${sensores.reportando}/${sensores.total}`}
                </strong>
                <span>Sensores</span>
              </li>
            </ul>

            {tarjeta.ocupacion !== null && (
              <div className="gp-perfil-ocupacion">
                <div className="gp-perfil-ocupacion-fila">
                  <span>Ocupación</span>
                  <strong>{Math.round(tarjeta.ocupacion)} %</strong>
                </div>
                <div className="gp-ocupacion-barra" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, tarjeta.ocupacion)}%` }} />
                </div>
              </div>
            )}

            {galponesDeGranja.length > 1 && (
              <div className="gp-perfil-galpones">
                <span className="gp-perfil-seccion-titulo">Galpones de {granja.nombre}</span>
                <ul className="gp-perfil-galpones-lista">
                  {galponesDeGranja.map((item) => {
                    const estadoItem = tarjetaGalpon(item)
                    const activo = item.id === galpon.id
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={`gp-perfil-galpon-btn${activo ? ' is-activa' : ''}`}
                          onClick={() => {
                            const query = pestana === 'resumen' ? '' : `?pestana=${pestana}`
                            navigate(`/granjas/galpones/${item.id}${query}`)
                          }}
                        >
                          <span className={`gp-perfil-galpon-punto gp-perfil-galpon-punto--${estadoItem.estado}`} aria-hidden="true" />
                          <span className="gp-perfil-galpon-nombre">{item.nombre}</span>
                          <small>
                            {(() => {
                              const activosItem = lotesActivosDeGalpon(item)
                              if (activosItem.length > 1) return `${activosItem.length} lotes`
                              return activosItem[0] ? `Día ${diasDeVida(activosItem[0].fecha_ingreso)}` : 'Vacío'
                            })()}
                          </small>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {puedeEditar && (
              <div className="gp-perfil-acciones">
                {lote ? (
                  <button
                    type="button"
                    className="gp-perfil-btn"
                    onClick={() => setDatos({ tipo: 'lote', lote })}
                  >
                    <IcEdit size={14} aria-hidden="true" />
                    Editar datos del lote
                  </button>
                ) : (
                  <button
                    type="button"
                    className="gp-perfil-btn"
                    onClick={() => setDatos({ tipo: 'granja', granja })}
                  >
                    <IcEdit size={14} aria-hidden="true" />
                    Editar datos de la granja
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ── Columna derecha: Pestañas flotantes + Tarjetas limpias (estilo /organizaciones/:id) ── */}
        <div className="gp-espacio">
          <div className="gp-tabs" role="tablist" aria-label={`Secciones de ${galpon.nombre}`}>
            <button
              type="button"
              role="tab"
              aria-selected={pestana === 'resumen'}
              className={`gp-tab${pestana === 'resumen' ? ' is-activa' : ''}`}
              onClick={() => cambiarPestana('resumen')}
            >
              <IcGrid size={15} aria-hidden="true" />
              <span>Resumen</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={pestana === 'lotes'}
              className={`gp-tab${pestana === 'lotes' ? ' is-activa' : ''}`}
              onClick={() => cambiarPestana('lotes')}
            >
              <IcEgg size={15} aria-hidden="true" />
              <span>Lotes</span>
              {lotesActivos.length > 0 && (
                <span className="gp-tab-conteo">{lotesActivos.length}</span>
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={pestana === 'bitacora'}
              className={`gp-tab${pestana === 'bitacora' ? ' is-activa' : ''}`}
              onClick={() => cambiarPestana('bitacora')}
            >
              <IcDoc size={15} aria-hidden="true" />
              <span>Bitácora</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={pestana === 'ambiente'}
              className={`gp-tab${pestana === 'ambiente' ? ' is-activa' : ''}`}
              onClick={() => cambiarPestana('ambiente', { sub: subAmbiente })}
            >
              <IcThermo size={15} aria-hidden="true" />
              <span>Ambiente y control</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={pestana === 'alertas'}
              className={`gp-tab${pestana === 'alertas' ? ' is-activa' : ''}`}
              onClick={() => cambiarPestana('alertas')}
            >
              <IcAlert size={15} aria-hidden="true" />
              <span>Alertas</span>
              {galpon.alertasAbiertas > 0 && (
                <span className="gp-tab-conteo is-alerta">{galpon.alertasAbiertas}</span>
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={pestana === 'datos'}
              className={`gp-tab${pestana === 'datos' ? ' is-activa' : ''}`}
              onClick={() => cambiarPestana('datos')}
            >
              <IcPin size={15} aria-hidden="true" />
              <span>Datos</span>
            </button>
          </div>

          <div className="gp-panel-espacio" key={`${galpon.id}-${pestana}`}>
            {pestana === 'resumen' && (
              <ResumenPestana
                galpon={galpon}
                indicadoresPorLote={indicadoresPorLote}
                paso={paso}
                onAbrirLote={(loteId) => cambiarPestana('lotes', { loteId })}
                onDestino={irADestino}
                onNavegar={irA}
                onCambioEstructura={() => { void recargarTodo() }}
              />
            )}

            {pestana === 'lotes' && (
              <LotesPestana
                galpon={galpon}
                loteSeleccionado={lote}
                indicadoresPorLote={indicadoresPorLote}
                consumoPorLote={consumoPorLote}
                curvaLote={curvaLote}
                onSeleccionarLote={seleccionarLote}
                onEditarDatos={(item) => setDatos({ tipo: 'lote', lote: item })}
                onNavegar={irA}
              />
            )}

            {pestana === 'bitacora' && (
              lote ? (
                <div className="gp-resumen">
                  {lotesActivos.length > 1 && (
                    <section className="gp-lotes-selector" aria-label="Lote en bitácora">
                      <div className="gp-lotes-selector-cabecera">
                        <span className="gp-rotulo">Registrando bitácora de</span>
                        <span className="gp-conteo">{lotesActivos.length} activos</span>
                      </div>
                      <div className="gp-lotes-pills" role="tablist" aria-label="Seleccionar lote para bitácora">
                        {lotesActivos.map((item) => {
                          const esActivo = lote.id === item.id
                          return (
                            <button
                              key={item.id}
                              type="button"
                              role="tab"
                              aria-selected={esActivo}
                              className={`gp-lote-pill${esActivo ? ' is-activa' : ''}`}
                              onClick={() => seleccionarLote(item.id)}
                            >
                              <span className="gp-lote-pill-codigo">{item.codigo}</span>
                              <span className="gp-lote-pill-meta">Día {diasDeVida(item.fecha_ingreso)}</span>
                            </button>
                          )
                        })}
                      </div>
                    </section>
                  )}
                  <BitacoraPestana
                    key={`${lote.id}-${vistaBitacora}`}
                    lote={lote}
                    vistaInicial={vistaBitacora}
                  />
                </div>
              ) : (
                <div className="gp-card gp-curva-vacia">
                  La bitácora se abre cuando el galpón tiene un lote en curso.
                </div>
              )
            )}

            {pestana === 'ambiente' && (
              <div className="gp-ambiente-espacio">
                <div className="gp-subtabs" role="tablist" aria-label="Vistas de ambiente y control">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={subAmbiente === 'sensores'}
                    className={`gp-subtab${subAmbiente === 'sensores' ? ' is-activa' : ''}`}
                    onClick={() => cambiarPestana('ambiente', { sub: 'sensores' })}
                  >
                    Sensores
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={subAmbiente === 'clima'}
                    className={`gp-subtab${subAmbiente === 'clima' ? ' is-activa' : ''}`}
                    onClick={() => cambiarPestana('ambiente', { sub: 'clima' })}
                  >
                    Clima y calor (THI)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={subAmbiente === 'actuadores'}
                    className={`gp-subtab${subAmbiente === 'actuadores' ? ' is-activa' : ''}`}
                    onClick={() => cambiarPestana('ambiente', { sub: 'actuadores' })}
                  >
                    Actuadores K1-K4
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={subAmbiente === 'umbrales'}
                    className={`gp-subtab${subAmbiente === 'umbrales' ? ' is-activa' : ''}`}
                    onClick={() => cambiarPestana('ambiente', { sub: 'umbrales' })}
                  >
                    Umbrales
                  </button>
                </div>

                {subAmbiente === 'sensores' ? (
                  <AmbientePestana
                    galpon={galpon}
                    revision={revision}
                    modo="sensores"
                    onIrABitacora={() => irA('/bitacora')}
                    onCambioEstructura={() => { void recargarTodo() }}
                  />
                ) : subAmbiente === 'clima' ? (
                  <AmbientePestana
                    galpon={galpon}
                    revision={revision}
                    modo="clima"
                    onCompletarUbicacion={puedeEditar ? () => setDatos({ tipo: 'granja', granja }) : undefined}
                  />
                ) : subAmbiente === 'actuadores' ? (
                  <ActuadoresGalpon
                    galponId={galpon.id}
                    sensores={galpon.sensores}
                    onCambio={() => { void recargarTodo() }}
                  />
                ) : (
                  <div className="gp-card">
                    <UmbralesPestana
                      galpon={galpon}
                      puedeConfigurar={permisosOperativosDeGalpon(getRol()).configurar}
                    />
                  </div>
                )}
              </div>
            )}

            {pestana === 'alertas' && (
              <Suspense fallback={<CargandoPestana />}>
                <AlertasPage key={galpon.id} galponFijo={galpon.id} />
              </Suspense>
            )}

            {pestana === 'datos' && (
              <DatosPestana
                granja={granja}
                galpon={galpon}
                onEditarGranja={puedeEditar ? () => setDatos({ tipo: 'granja', granja }) : undefined}
                onEditarLote={puedeEditar ? (item) => setDatos({ tipo: 'lote', lote: item }) : undefined}
              />
            )}
          </div>
        </div>
      </div>

      {datos?.tipo === 'granja' && (
        <ModalDatosGranja granja={datos.granja} onCerrar={() => setDatos(null)} onGuardado={recargarTodo} />
      )}
      {datos?.tipo === 'lote' && (
        <ModalDatosLote
          lote={datos.lote}
          lineasGeneticas={lineasGeneticas}
          onCerrar={() => setDatos(null)}
          onGuardado={recargarTodo}
        />
      )}
    </div>
  )
}

export default GalponDetallePropietarioPage
