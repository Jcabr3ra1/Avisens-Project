import { useMemo, useState, type FormEvent } from 'react'
import { getRol } from '@shared/api'
import { ROL_ADMIN } from '@shared/auth/permisos'
import { IcDoc, IcDrop, IcHeart, IcRefresh, IcScale, IcSeed } from '@shared/ui/icons/icons'
import GestionConsumos from '@features/consumos-diarios/components/GestionConsumos'
import { mensajeDeError } from '@shared/utils/errores'
import AccionesRapidasBitacora from './components/AccionesRapidasBitacora'
import FormularioRegistro from './components/FormularioRegistro'
import HistorialRegistros from './components/HistorialRegistros'
import ResumenLote from './components/ResumenLote'
import { useBitacora } from './hooks/useBitacora'
import {
  FORMULARIO_INICIAL,
  type FormularioRegistro as DatosFormulario,
  type TipoRegistro,
} from './model/bitacora'
import {
  calcularResumenBitacora,
  crearFilasRegistro,
  filtrarRegistrosPorLote,
  type VistaBitacora,
} from './model/resumenBitacora'
import './BitacoraPage.css'

const ETIQUETA: Record<TipoRegistro, string> = {
  peso: 'Pesajes',
  mortalidad: 'Mortalidad',
  sanitario: 'Sanidad',
}

function BitacoraPage() {
  const datos = useBitacora()
  const esAdministrador = getRol() === ROL_ADMIN
  const [granjaId, setGranjaId] = useState<number | null>(null)
  const [galponId, setGalponId] = useState<number | null>(null)
  const [loteId, setLoteId] = useState<number | null>(null)
  const [vista, setVista] = useState<VistaBitacora>('resumen')
  const [modal, setModal] = useState<TipoRegistro | null>(null)
  const [form, setForm] = useState<DatosFormulario>(FORMULARIO_INICIAL)
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
  const pesajes = useMemo(() => filtrarRegistrosPorLote(datos.pesajes, loteSeleccionadoId), [datos.pesajes, loteSeleccionadoId])
  const mortalidad = useMemo(() => filtrarRegistrosPorLote(datos.mortalidad, loteSeleccionadoId), [datos.mortalidad, loteSeleccionadoId])
  const sanitarios = useMemo(() => filtrarRegistrosPorLote(datos.sanitarios, loteSeleccionadoId), [datos.sanitarios, loteSeleccionadoId])
  const consumos = useMemo(() => filtrarRegistrosPorLote(datos.consumos, loteSeleccionadoId), [datos.consumos, loteSeleccionadoId])
  const resumen = useMemo(
    () => calcularResumenBitacora(pesajes, mortalidad, sanitarios, consumos),
    [consumos, mortalidad, pesajes, sanitarios],
  )
  const filas = useMemo(
    () => crearFilasRegistro(vista, pesajes, mortalidad, sanitarios),
    [mortalidad, pesajes, sanitarios, vista],
  )

  const abrir = (tipo: TipoRegistro) => {
    setForm(FORMULARIO_INICIAL)
    setErrorForm('')
    setModal(tipo)
  }

  const cambiar = <K extends keyof DatosFormulario>(campo: K, valor: DatosFormulario[K]) => {
    setForm((actual) => ({ ...actual, [campo]: valor }))
  }

  const guardar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!modal || !loteSeleccionadoId) return

    let payload: object = {
      lote_id: loteSeleccionadoId,
      fecha: form.fecha,
      metodo_registro: 'manual',
      observaciones: form.observaciones || undefined,
    }

    if (modal === 'peso') {
      payload = {
        ...payload,
        peso_promedio_g: Number(form.peso_promedio_g),
        cantidad_aves_pesadas: form.cantidad_aves_pesadas ? Number(form.cantidad_aves_pesadas) : undefined,
        peso_objetivo_g: form.peso_objetivo_g ? Number(form.peso_objetivo_g) : undefined,
      }
    }

    if (modal === 'mortalidad') {
      payload = {
        ...payload,
        cantidad_aves: Number(form.cantidad_aves),
        causa_presuntiva: form.causa_presuntiva || undefined,
      }
    }

    if (modal === 'sanitario') {
      payload = {
        ...payload,
        tipo: form.tipo,
        producto: form.producto || undefined,
        diagnostico: form.diagnostico || undefined,
      }
    }

    setGuardando(true)
    setErrorForm('')
    void datos
      .crear(modal, payload)
      .then(() => setModal(null))
      .catch((error) => setErrorForm(mensajeDeError(error, 'No se pudo guardar el registro.')))
      .finally(() => setGuardando(false))
  }

  const borrar = (tipo: TipoRegistro, id: number) => {
    if (window.confirm('¿Eliminar este registro?')) {
      void datos.eliminar(tipo, id).catch(() => undefined)
    }
  }

  if (datos.cargando) {
    return (
      <div className="page-container bit-page">
        <p className="bit-vacio">Cargando bitácora…</p>
      </div>
    )
  }

  return (
    <div className={`page-container bit-page${esAdministrador ? ' bit-page--admin' : ''}`}>
      <header className="bit-header">
        <div>
          <p>{esAdministrador ? 'Control de organización' : 'Control productivo'}</p>
          <h1>{esAdministrador ? 'Bitácora de producción' : 'Bitácora del lote'}</h1>
          <span>
            {esAdministrador
              ? 'Consulta y registra la actividad de los lotes activos.'
              : 'Registra y consulta el estado real de tus aves.'}
          </span>
        </div>
        <div className="bit-header-controles">
          <fieldset className="bit-selector-jerarquico">
            <legend>Ubicación en seguimiento</legend>
            <label>
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
                {!granjas.length && <option value="">Sin granjas con lotes activos</option>}
                {granjas.map((granja) => <option key={granja.id} value={granja.id}>{granja.nombre}</option>)}
              </select>
            </label>
            <label>
              <span>Galpón</span>
              <select
                value={galponSeleccionadoId ?? ''}
                disabled={!galpones.length}
                onChange={(evento) => {
                  setGalponId(Number(evento.target.value))
                  setLoteId(null)
                }}
              >
                {!galpones.length && <option value="">Sin galpones disponibles</option>}
                {galpones.map((galpon) => <option key={galpon.id} value={galpon.id}>{galpon.nombre}</option>)}
              </select>
            </label>
            <label>
              <span>Lote activo</span>
              <select
                value={loteSeleccionadoId ?? ''}
                disabled={!lotesDelGalpon.length}
                onChange={(evento) => setLoteId(Number(evento.target.value))}
              >
                {!lotesDelGalpon.length && <option value="">Sin lotes activos</option>}
                {lotesDelGalpon.map((item) => <option key={item.id} value={item.id}>{item.codigo}</option>)}
              </select>
            </label>
          </fieldset>
          <button type="button" className="bit-actualizar" onClick={() => void datos.recargar()}>
            <IcRefresh size={15} aria-hidden="true" />
            Actualizar
          </button>
        </div>
      </header>

      {datos.error && (
        <div className="bit-alert" role="alert">
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
        <>
          <section className="bit-contexto-lote" aria-label="Lote seleccionado">
            <div>
              <p className="bit-kicker">Lote activo</p>
              <h2>{lote.codigo}</h2>
              <p>Galpón {lote.galpon.nombre} · {lote.cantidad_inicial.toLocaleString('es-CO')} aves iniciales</p>
            </div>
            <span role="status" aria-atomic="true">{resumen.totalRegistros} registros en este lote</span>
          </section>

          <ResumenLote resumen={resumen} />

          <nav className="bit-tabs" aria-label="Secciones de la bitácora">
            {(
              [
                ['resumen', 'Resumen', <IcDoc size={15} />],
                ['peso', 'Pesajes', <IcScale size={15} />],
                ['mortalidad', 'Mortalidad', <IcHeart size={15} />],
                ['sanitario', 'Sanidad', <IcDrop size={15} />],
                ['consumo', 'Consumos', <IcSeed size={15} />],
              ] as const
            ).map(([id, etiqueta, icono]) => (
              <button
                key={id}
                type="button"
                aria-pressed={vista === id}
                className={vista === id ? 'activo' : ''}
                onClick={() => setVista(id)}
              >
                <span aria-hidden="true">{icono}</span>
                {etiqueta}
              </button>
            ))}
          </nav>

          {vista === 'resumen' ? (
            <AccionesRapidasBitacora
              codigoLote={lote.codigo}
              onRegistrar={abrir}
              onRegistrarConsumo={() => setVista('consumo')}
            />
          ) : vista === 'consumo' ? (
            <GestionConsumos loteFijo={loteSeleccionadoId} />
          ) : (
            <HistorialRegistros
              titulo={ETIQUETA[vista]}
              codigoLote={lote.codigo}
              filas={filas}
              onNuevo={() => abrir(vista)}
              onEliminar={(id) => borrar(vista, id)}
            />
          )}
        </>
      )}

      {modal && (
        <FormularioRegistro
          tipo={modal}
          form={form}
          guardando={guardando}
          error={errorForm}
          onCambiar={cambiar}
          onGuardar={guardar}
          onCerrar={() => !guardando && setModal(null)}
        />
      )}
    </div>
  )
}

export default BitacoraPage
