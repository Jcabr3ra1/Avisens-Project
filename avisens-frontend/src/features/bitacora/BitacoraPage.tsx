import { confirmarAccion } from '@shared/ui/ConfirmarAccion/gestorConfirmacion'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getRol } from '@shared/api'
import { ROL_ADMIN, ROL_PROPIETARIO, permisosDeRegistro } from '@shared/auth/permisos'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import { IcAlert, IcBarn, IcCal, IcDoc, IcDrop, IcScale, IcSeed } from '@shared/ui/icons/icons'
import { useRefetchOnFocus } from '@shared/hooks/useRefetchOnFocus'
import GestionConsumos from '@features/consumos-diarios/components/GestionConsumos'
import { toast } from 'sonner'
import { mensajeDeError } from '@shared/utils/errores'
import AccionesRapidasBitacora from './components/AccionesRapidasBitacora'
import ActividadRecienteBitacora from './components/ActividadRecienteBitacora'
import FormularioRegistro from './components/FormularioRegistro'
import HistorialRegistros from './components/HistorialRegistros'
import ModalFotoMortalidad from './components/ModalFotoMortalidad'
import ResumenLote from './components/ResumenLote'
import { subirFotoMortalidad } from './api/bitacora'
import { useBitacora } from './hooks/useBitacora'
import { useInsumosDeGranja } from './hooks/useInsumosDeGranja'
import {
  errorDeRegistro,
  FORMULARIO_INICIAL,
  formularioDesde,
  payloadRegistro,
  type FormularioRegistro as DatosFormulario,
  type TipoRegistro,
} from './model/bitacora'
import {
  calcularResumenBitacora,
  calcularSaludCicloLote,
  crearActividadReciente,
  crearFilasRegistro,
  filtrarRegistrosPorLote,
  type VistaBitacora,
} from './model/resumenBitacora'
import '@shared/ui/admin/AdminKit.css'
import './BitacoraPage.css'

const ETIQUETA: Record<TipoRegistro, string> = {
  peso: 'Pesajes',
  mortalidad: 'Mortalidad',
  sanitario: 'Sanidad',
}

function fechaIngresoLegible(fecha: string) {
  return new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function BitacoraPage() {
  const navigate = useNavigate()
  const datos = useBitacora()
  useRefetchOnFocus(datos.recargar)
  const rol = getRol()
  const esAdministrador = rol === ROL_ADMIN
  const permisosRegistro = permisosDeRegistro(rol)
  const [granjaId, setGranjaId] = useState<number | null>(null)
  const [galponId, setGalponId] = useState<number | null>(null)
  const [parametros] = useSearchParams()
  const vistaSolicitada = parametros.get('vista')
  const [loteId, setLoteId] = useState<number | null>(null)
  const [vista, setVista] = useState<VistaBitacora>(() =>
    vistaSolicitada === 'peso' || vistaSolicitada === 'mortalidad' || vistaSolicitada === 'sanitario' || vistaSolicitada === 'consumo'
      ? vistaSolicitada
      : 'resumen',
  )
  const [modal, setModal] = useState<TipoRegistro | null>(null)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const loteSolicitado = Number(parametros.get('lote'))
  const destinoAplicado = useRef(false)

  // Para el Propietario, la bitácora oficial está integrada en la vista de Granjas (/granjas)
  useEffect(() => {
    if (rol === ROL_PROPIETARIO && datos.lotes.length > 0) {
      const destino = Number.isSafeInteger(loteSolicitado) && loteSolicitado > 0
        ? datos.lotes.find((item) => item.id === loteSolicitado)
        : datos.lotes[0]
      if (destino) {
        navigate(
          `/granjas?granjaId=${destino.galpon.granja.id}&galpon=${destino.galpon.id}&pestana=bitacora${vistaSolicitada ? `&vista=${vistaSolicitada}` : ''}`,
          { replace: true },
        )
      }
    }
  }, [rol, datos.lotes, loteSolicitado, vistaSolicitada, navigate])

  useEffect(() => {
    if (destinoAplicado.current || !Number.isSafeInteger(loteSolicitado) || loteSolicitado <= 0) return
    const destino = datos.lotes.find((item) => item.id === loteSolicitado)
    if (!destino) return
    destinoAplicado.current = true
    setGranjaId(destino.galpon.granja.id)
    setGalponId(destino.galpon.id)
    setLoteId(destino.id)
  }, [datos.lotes, loteSolicitado])

  const [form, setForm] = useState<DatosFormulario>(FORMULARIO_INICIAL)
  const [fotoMortalidad, setFotoMortalidad] = useState<File | null>(null)
  const [mortalidadFotoId, setMortalidadFotoId] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')

  const granjas = useMemo(() => {
    const granjasPorId = new Map<number, { id: number; nombre: string }>()

    datos.lotes.forEach((item) => {
      granjasPorId.set(item.galpon.granja.id, {
        id: item.galpon.granja.id,
        nombre: item.galpon.granja.nombre,
      })
    })

    return [...granjasPorId.values()].sort((primera, segunda) => primera.nombre.localeCompare(segunda.nombre, 'es'))
  }, [datos.lotes])

  const granjaSeleccionadaId = granjas.some((granja) => granja.id === granjaId)
    ? granjaId
    : (granjas[0]?.id ?? null)

  const galpones = useMemo(() => {
    const galponesPorId = new Map<number, { id: number; nombre: string }>()

    datos.lotes
      .filter((item) => item.galpon.granja.id === granjaSeleccionadaId)
      .forEach((item) => {
        galponesPorId.set(item.galpon.id, { id: item.galpon.id, nombre: item.galpon.nombre })
      })

    return [...galponesPorId.values()].sort((primero, segundo) => primero.nombre.localeCompare(segundo.nombre, 'es'))
  }, [datos.lotes, granjaSeleccionadaId])

  const galponSeleccionadoId = galpones.some((galpon) => galpon.id === galponId)
    ? galponId
    : (galpones[0]?.id ?? null)

  const lotesDelGalpon = useMemo(
    () => datos.lotes.filter((item) => item.galpon.id === galponSeleccionadoId),
    [datos.lotes, galponSeleccionadoId],
  )

  const loteSeleccionadoId = lotesDelGalpon.some((item) => item.id === loteId)
    ? loteId
    : (lotesDelGalpon[0]?.id ?? null)

  const lote = lotesDelGalpon.find((item) => item.id === loteSeleccionadoId)
  const insumosGranja = useInsumosDeGranja(lote?.galpon.granja.id ?? null, modal === 'sanitario')
  const pesajes = useMemo(() => filtrarRegistrosPorLote(datos.pesajes, loteSeleccionadoId), [datos.pesajes, loteSeleccionadoId])
  const mortalidad = useMemo(() => filtrarRegistrosPorLote(datos.mortalidad, loteSeleccionadoId), [datos.mortalidad, loteSeleccionadoId])
  const sanitarios = useMemo(() => filtrarRegistrosPorLote(datos.sanitarios, loteSeleccionadoId), [datos.sanitarios, loteSeleccionadoId])
  const consumos = useMemo(() => filtrarRegistrosPorLote(datos.consumos, loteSeleccionadoId), [datos.consumos, loteSeleccionadoId])

  const resumen = useMemo(
    () => calcularResumenBitacora(pesajes, mortalidad, sanitarios, consumos),
    [consumos, mortalidad, pesajes, sanitarios],
  )

  const saludCiclo = useMemo(
    () =>
      lote
        ? calcularSaludCicloLote(lote.fecha_ingreso, lote.cantidad_inicial, resumen.avesMuertas)
        : null,
    [lote, resumen.avesMuertas],
  )

  const actividadReciente = useMemo(
    () => crearActividadReciente(pesajes, mortalidad, sanitarios, consumos, 6),
    [consumos, mortalidad, pesajes, sanitarios],
  )

  const filas = useMemo(
    () => crearFilasRegistro(vista, pesajes, mortalidad, sanitarios),
    [mortalidad, pesajes, sanitarios, vista],
  )

  const abrir = (tipo: TipoRegistro) => {
    setForm(FORMULARIO_INICIAL)
    setFotoMortalidad(null)
    setErrorForm('')
    setEditandoId(null)
    setModal(tipo)
  }

  const abrirEdicion = (tipo: TipoRegistro, id: number) => {
    const registros = tipo === 'peso' ? pesajes : tipo === 'mortalidad' ? mortalidad : sanitarios
    const registro = registros.find((item) => item.id === id)
    if (!registro) return
    setForm(formularioDesde(tipo, registro))
    setFotoMortalidad(null)
    setErrorForm('')
    setEditandoId(id)
    setModal(tipo)
  }

  const cambiar = <K extends keyof DatosFormulario>(campo: K, valor: DatosFormulario[K]) => {
    setForm((actual) => ({ ...actual, [campo]: valor }))
  }

  const guardar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!modal || !loteSeleccionadoId) return

    const problema = errorDeRegistro(modal, form)
    if (problema) {
      setErrorForm(problema)
      return
    }

    setGuardando(true)
    setErrorForm('')
    const tipoActual = modal
    const archivoAdjunto = tipoActual === 'mortalidad' ? fotoMortalidad : null
    const accion = editandoId !== null
      ? datos.actualizar(tipoActual, editandoId, payloadRegistro(tipoActual, form, loteSeleccionadoId))
      : datos.crear(tipoActual, payloadRegistro(tipoActual, form, loteSeleccionadoId))
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
        setModal(null)
        setEditandoId(null)
        setFotoMortalidad(null)
      })
      .catch((error) => setErrorForm(mensajeDeError(error, 'No se pudo guardar el registro.')))
      .finally(() => setGuardando(false))
  }

  const borrar = async (tipo: TipoRegistro, id: number) => {
    if (!(await confirmarAccion({
      titulo: '¿Eliminar este registro?',
      entidad: ETIQUETA[tipo],
      descripcion: 'Esta acción eliminará el registro seleccionado de la bitácora del lote.',
      textoConfirmar: 'Eliminar registro',
      tono: 'peligro',
    }))) return
    void datos.eliminar(tipo, id).catch((error) => {
      toast.error(mensajeDeError(error, 'No se pudo eliminar el registro.'))
    })
  }

  if (datos.cargando) {
    return (
      <div className="page-container bit-page adm-page" role="status">
        <p className="bit-vacio">Cargando bitácora…</p>
      </div>
    )
  }

  const lineaGenetica = lote?.linea_genetica?.nombre || lote?.raza || null

  return (
    <div className={`page-container bit-page adm-page${esAdministrador ? ' bit-page--admin' : ''}`}>
      <CabeceraAdmin
        eyebrow={esAdministrador ? 'Control de organización' : 'Seguimiento de campo'}
        titulo={esAdministrador ? 'Bitácora de producción' : 'Bitácora del lote'}
        subtitulo={esAdministrador
          ? 'Consulta y registra la actividad de los lotes activos.'
          : 'Registra y consulta el estado diario de tus aves.'}
        acciones={lote ? (
          <div className="bit-cab-acciones">
            <button
              type="button"
              className="adm-btn adm-btn--secundario"
              onClick={() => abrir('mortalidad')}
            >
              <IcAlert size={15} aria-hidden="true" />
              Mortalidad
            </button>
            <button
              type="button"
              className="adm-btn adm-btn--primario"
              onClick={() => abrir('peso')}
            >
              <IcScale size={15} aria-hidden="true" />
              Registrar peso
            </button>
          </div>
        ) : undefined}
      />

      {datos.error && (
        <div className="bit-alert adm-alerta" role="alert">
          <span>{datos.error}</span>
          <button type="button" onClick={() => void datos.recargar()}>Reintentar</button>
        </div>
      )}

      {!lote ? (
        <section className="bit-card bit-vacio">
          <h2>No hay lotes activos</h2>
          <p>Cuando exista un lote activo, su control diario aparecerá aquí.</p>
        </section>
      ) : (
        <div className="bit-expediente">
          <aside className="bit-ficha" aria-label="Expediente del lote seleccionado">
            <header className="bit-ficha-hero">
              <div className="bit-ficha-hero-top">
                <span className="bit-ficha-pill">
                  <span className="bit-ficha-dot" aria-hidden="true" />
                  Lote activo
                </span>
                {saludCiclo && (
                  <span className="bit-ficha-dia">Día {saludCiclo.diasCiclo}</span>
                )}
              </div>
              <h2 className="bit-ficha-codigo">{lote.codigo}</h2>
              <p className="bit-ficha-ubicacion">
                <IcBarn size={14} aria-hidden="true" />
                <span>{lote.galpon.nombre} · {lote.galpon.granja.nombre}</span>
              </p>
              <div className="bit-ficha-tags">
                <span className="bit-ficha-tag">
                  <IcCal size={12} aria-hidden="true" />
                  Ingreso {fechaIngresoLegible(lote.fecha_ingreso)}
                </span>
                {lineaGenetica && (
                  <span className="bit-ficha-tag">{lineaGenetica}</span>
                )}
              </div>
            </header>

            <div className="bit-ficha-cuerpo">
              <div className="bit-ficha-bloque">
                <span className="bit-ficha-seccion-titulo">Ubicación en seguimiento</span>
                <div className="bit-ficha-selectores">
                  <label className="bit-campo">
                    <span>Granja</span>
                    <select
                      value={granjaSeleccionadaId ?? ''}
                      disabled={!granjas.length}
                      onChange={(evento) => {
                        setGranjaId(Number(evento.target.value))
                        setGalponId(null)
                        setLoteId(null)
                      }}
                    >
                      {!granjas.length && <option value="">Sin granjas</option>}
                      {granjas.map((granja) => <option key={granja.id} value={granja.id}>{granja.nombre}</option>)}
                    </select>
                  </label>
                  <div className="bit-ficha-par">
                    <label className="bit-campo">
                      <span>Galpón</span>
                      <select
                        value={galponSeleccionadoId ?? ''}
                        disabled={!galpones.length}
                        onChange={(evento) => {
                          setGalponId(Number(evento.target.value))
                          setLoteId(null)
                        }}
                      >
                        {!galpones.length && <option value="">Sin galpones</option>}
                        {galpones.map((galpon) => <option key={galpon.id} value={galpon.id}>{galpon.nombre}</option>)}
                      </select>
                    </label>
                    <label className="bit-campo">
                      <span>Lote</span>
                      <select
                        value={loteSeleccionadoId ?? ''}
                        disabled={!lotesDelGalpon.length}
                        onChange={(evento) => setLoteId(Number(evento.target.value))}
                      >
                        {!lotesDelGalpon.length && <option value="">Sin lotes</option>}
                        {lotesDelGalpon.map((item) => <option key={item.id} value={item.id}>{item.codigo}</option>)}
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              {saludCiclo && (
                <div className="bit-ficha-bloque">
                  <span className="bit-ficha-seccion-titulo">Estado del lote</span>

                  <div className="bit-progreso">
                    <div className="bit-progreso-cab">
                      <span>Supervivencia</span>
                      <strong className={`bit-progreso-val bit-progreso-val--${saludCiclo.tonoSupervivencia}`}>
                        {saludCiclo.supervivenciaPct.toLocaleString('es-CO')}%
                      </strong>
                    </div>
                    <div className="bit-barra" aria-hidden="true">
                      <span
                        className={`bit-barra-fill bit-barra-fill--${saludCiclo.tonoSupervivencia}`}
                        style={{ width: `${saludCiclo.supervivenciaPct}%` }}
                      />
                    </div>
                    <small className="bit-progreso-pie">
                      {saludCiclo.avesVivas.toLocaleString('es-CO')} vivas de {lote.cantidad_inicial.toLocaleString('es-CO')} iniciales
                    </small>
                  </div>

                  <div className="bit-progreso">
                    <div className="bit-progreso-cab">
                      <span>Avance del ciclo</span>
                      <strong className="bit-progreso-val">Día {saludCiclo.diasCiclo} / 42</strong>
                    </div>
                    <div className="bit-barra" aria-hidden="true">
                      <span
                        className="bit-barra-fill bit-barra-fill--ciclo"
                        style={{ width: `${saludCiclo.progresoCicloPct}%` }}
                      />
                    </div>
                    <small className="bit-progreso-pie" role="status" aria-atomic="true">
                      {resumen.totalRegistros} {resumen.totalRegistros === 1 ? 'registro' : 'registros'} en este lote
                    </small>
                  </div>
                </div>
              )}

              <div className="bit-ficha-bloque">
                <span className="bit-ficha-seccion-titulo">Registros por frente</span>
                <div className="bit-ficha-contadores">
                  {(
                    [
                      ['peso', 'Pesajes', pesajes.length],
                      ['mortalidad', 'Mortalidad', mortalidad.length],
                      ['sanitario', 'Sanidad', sanitarios.length],
                      ['consumo', 'Consumos', consumos.length],
                    ] as const
                  ).map(([id, etiqueta, total]) => (
                    <button
                      key={id}
                      type="button"
                      className={`bit-mini-stat${vista === id ? ' is-activo' : ''}`}
                      onClick={() => setVista(id)}
                    >
                      <span>{etiqueta}</span>
                      <strong>{total}</strong>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <main className="bit-main">
            <ResumenLote resumen={resumen} vistaActiva={vista} onSeleccionarVista={setVista} />

            <nav className="bit-tabs" aria-label="Secciones de la bitácora">
              {(
                [
                  ['resumen', 'Resumen', <IcDoc size={15} />, null],
                  ['peso', 'Pesajes', <IcScale size={15} />, pesajes.length],
                  ['mortalidad', 'Mortalidad', <IcAlert size={15} />, mortalidad.length],
                  ['sanitario', 'Sanidad', <IcDrop size={15} />, sanitarios.length],
                  ['consumo', 'Consumos', <IcSeed size={15} />, consumos.length],
                ] as const
              ).map(([id, etiqueta, icono, cantidad]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={vista === id}
                  className={`bit-tab${vista === id ? ' is-activa' : ''}`}
                  onClick={() => setVista(id)}
                >
                  <span className="bit-tab-icono" aria-hidden="true">{icono}</span>
                  <span>{etiqueta}</span>
                  {cantidad !== null && <span className="bit-tab-conteo">{cantidad}</span>}
                </button>
              ))}
            </nav>

            {vista === 'resumen' ? (
              <div className="bit-resumen-stack">
                <AccionesRapidasBitacora
                  codigoLote={lote.codigo}
                  resumen={resumen}
                  conteos={{
                    pesajes: pesajes.length,
                    mortalidad: mortalidad.length,
                    sanitarios: sanitarios.length,
                    consumos: consumos.length,
                  }}
                  onRegistrar={abrir}
                  onRegistrarConsumo={() => setVista('consumo')}
                />
                <ActividadRecienteBitacora
                  eventos={actividadReciente}
                  codigoLote={lote.codigo}
                  onVerSeccion={setVista}
                />
              </div>
            ) : vista === 'consumo' ? (
              <GestionConsumos loteFijo={loteSeleccionadoId} />
            ) : (
              <HistorialRegistros
                titulo={ETIQUETA[vista]}
                codigoLote={lote.codigo}
                filas={filas}
                permisos={permisosRegistro}
                onNuevo={() => abrir(vista)}
                onEditar={(id) => abrirEdicion(vista, id)}
                onEliminar={(id) => borrar(vista, id)}
                onVerFoto={vista === 'mortalidad' ? (id) => setMortalidadFotoId(id) : undefined}
                resaltadoId={vista === 'peso' ? pesajes.find((item) => item.peso_promedio_g > 10000)?.id ?? null : null}
              />
            )}
          </main>
        </div>
      )}

      {modal && (
        <FormularioRegistro
          tipo={modal}
          form={form}
          guardando={guardando}
          error={errorForm}
          onCambiar={cambiar}
          onGuardar={guardar}
          onCerrar={() => {
            if (guardando) return
            setModal(null)
            setEditandoId(null)
            setFotoMortalidad(null)
          }}
          editando={editandoId !== null}
          insumos={insumosGranja}
          fotoMortalidad={modal === 'mortalidad' ? fotoMortalidad : null}
          tieneFotoActual={
            modal === 'mortalidad' && editandoId !== null
              ? Boolean(mortalidad.find((item) => item.id === editandoId)?.foto_mime_type)
              : false
          }
          onCambiarFotoMortalidad={modal === 'mortalidad' ? setFotoMortalidad : undefined}
          onErrorFoto={modal === 'mortalidad' ? setErrorForm : undefined}
        />
      )}

      {mortalidadFotoId !== null && (() => {
        const registroFoto = mortalidad.find((item) => item.id === mortalidadFotoId)
        if (!registroFoto) return null
        return (
          <ModalFotoMortalidad
            registro={registroFoto}
            onCerrar={() => setMortalidadFotoId(null)}
            onActualizado={datos.marcarFotoMortalidad}
          />
        )
      })()}
    </div>
  )
}

export default BitacoraPage
