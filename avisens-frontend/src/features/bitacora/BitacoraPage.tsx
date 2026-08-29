import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { IcDoc, IcDrop, IcHeart, IcScale, IcSeed } from '@shared/ui/icons/icons'
import { mensajeDeError } from '@shared/utils/errores'
import FormularioRegistro from './components/FormularioRegistro'
import { useBitacora } from './hooks/useBitacora'
import {
  FORMULARIO_INICIAL,
  type FormularioRegistro as DatosFormulario,
  type TipoRegistro,
} from './model/bitacora'
import './BitacoraPage.css'

type Vista = 'resumen' | TipoRegistro | 'consumo'
const ETIQUETA: Record<TipoRegistro, string> = {
  peso: 'Pesajes',
  mortalidad: 'Mortalidad',
  sanitario: 'Sanidad',
}
const formatearFecha = (v: string) =>
  new Date(`${v.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO')

function BitacoraPage() {
  const datos = useBitacora()
  const [loteId, setLoteId] = useState<number | null>(null)
  const [vista, setVista] = useState<Vista>('resumen')
  const [modal, setModal] = useState<TipoRegistro | null>(null)
  const [form, setForm] = useState<DatosFormulario>(FORMULARIO_INICIAL)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')
  useEffect(() => {
    if (loteId === null && datos.lotes[0]) setLoteId(datos.lotes[0].id)
  }, [datos.lotes, loteId])
  const lote = datos.lotes.find((x) => x.id === loteId)
  const pesajes = datos.pesajes.filter((x) => x.lote_id === loteId)
  const mortalidad = datos.mortalidad.filter((x) => x.lote_id === loteId)
  const sanitarios = datos.sanitarios.filter((x) => x.lote_id === loteId)
  const consumos = datos.consumos.filter((x) => x.lote_id === loteId)
  const ultimoPeso = pesajes[0]
  const alimento = consumos.reduce((a, x) => a + Number(x.alimento_kg ?? 0), 0)
  const agua = consumos.reduce((a, x) => a + Number(x.agua_litros ?? 0), 0)
  const avesMuertas = mortalidad.reduce((a, x) => a + x.cantidad_aves, 0)
  const abrir = (tipo: TipoRegistro) => {
    setForm(FORMULARIO_INICIAL)
    setErrorForm('')
    setModal(tipo)
  }
  const cambiar = <K extends keyof DatosFormulario>(
    c: K,
    v: DatosFormulario[K]
  ) => setForm((x) => ({ ...x, [c]: v }))
  const guardar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!modal || !loteId) return
    let payload: object = {
      lote_id: loteId,
      fecha: form.fecha,
      metodo_registro: 'manual',
      observaciones: form.observaciones || undefined,
    }
    if (modal === 'peso')
      payload = {
        ...payload,
        peso_promedio_g: Number(form.peso_promedio_g),
        cantidad_aves_pesadas: form.cantidad_aves_pesadas
          ? Number(form.cantidad_aves_pesadas)
          : undefined,
        peso_objetivo_g: form.peso_objetivo_g
          ? Number(form.peso_objetivo_g)
          : undefined,
      }
    if (modal === 'mortalidad')
      payload = {
        ...payload,
        cantidad_aves: Number(form.cantidad_aves),
        causa_presuntiva: form.causa_presuntiva || undefined,
      }
    if (modal === 'sanitario')
      payload = {
        ...payload,
        tipo: form.tipo,
        producto: form.producto || undefined,
        diagnostico: form.diagnostico || undefined,
      }
    setGuardando(true)
    setErrorForm('')
    void datos
      .crear(modal, payload)
      .then(() => setModal(null))
      .catch((err) =>
        setErrorForm(mensajeDeError(err, 'No se pudo guardar el registro.'))
      )
      .finally(() => setGuardando(false))
  }
  const borrar = (tipo: TipoRegistro, id: number) => {
    if (window.confirm('¿Eliminar este registro?'))
      void datos.eliminar(tipo, id).catch(() => undefined)
  }
  const filas = useMemo(
    () =>
      vista === 'peso'
        ? pesajes.map((x) => ({
            id: x.id,
            fecha: x.fecha,
            principal: `${x.peso_promedio_g.toLocaleString('es-CO')} g`,
            detalle: x.observaciones || 'Sin observaciones',
          }))
        : vista === 'mortalidad'
          ? mortalidad.map((x) => ({
              id: x.id,
              fecha: x.fecha,
              principal: `${x.cantidad_aves} aves`,
              detalle: x.causa_presuntiva || 'Sin causa registrada',
            }))
          : vista === 'sanitario'
            ? sanitarios.map((x) => ({
                id: x.id,
                fecha: x.fecha,
                principal: x.tipo,
                detalle: x.producto || x.diagnostico || 'Sin detalle',
              }))
            : [],
    [vista, pesajes, mortalidad, sanitarios]
  )
  if (datos.cargando)
    return (
      <div className='page-container bit-page'>
        <p className='bit-vacio'>Cargando bitácora…</p>
      </div>
    )
  return (
    <div className='page-container bit-page'>
      <header className='bit-header'>
        <div>
          <p>Control productivo</p>
          <h1>Bitácora del lote</h1>
          <span>Registra y consulta el estado real de tus aves.</span>
        </div>
        <select
          value={loteId ?? ''}
          onChange={(e) => setLoteId(Number(e.target.value))}
          aria-label='Seleccionar lote'
        >
          {datos.lotes.map((x) => (
            <option key={x.id} value={x.id}>
              {x.codigo} · {x.galpon.nombre}
            </option>
          ))}
        </select>
      </header>
      {datos.error && (
        <div className='bit-alert' role='alert'>
          {datos.error}
          <button onClick={() => void datos.recargar()}>Reintentar</button>
        </div>
      )}
      {!lote ? (
        <section className='bit-card bit-vacio'>
          <h2>No hay lotes activos</h2>
          <p>Primero registra un lote para comenzar su seguimiento diario.</p>
        </section>
      ) : (
        <>
          <section className='bit-kpis'>
            <article>
              <IcScale size={19} />
              <small>Último peso</small>
              <strong>
                {ultimoPeso
                  ? `${ultimoPeso.peso_promedio_g.toLocaleString('es-CO')} g`
                  : 'Sin dato'}
              </strong>
            </article>
            <article>
              <IcHeart size={19} />
              <small>Mortalidad acumulada</small>
              <strong>{avesMuertas} aves</strong>
            </article>
            <article>
              <IcSeed size={19} />
              <small>Alimento registrado</small>
              <strong>{alimento.toLocaleString('es-CO')} kg</strong>
            </article>
            <article>
              <IcDrop size={19} />
              <small>Agua registrada</small>
              <strong>{agua.toLocaleString('es-CO')} L</strong>
            </article>
          </section>
          <nav className='bit-tabs' aria-label='Secciones de la bitácora'>
            {(
              [
                ['resumen', 'Resumen', <IcDoc size={15} />],
                ['peso', 'Pesajes', <IcScale size={15} />],
                ['mortalidad', 'Mortalidad', <IcHeart size={15} />],
                ['sanitario', 'Sanidad', <IcDrop size={15} />],
                ['consumo', 'Consumos', <IcSeed size={15} />],
              ] as const
            ).map(([id, label, icon]) => (
              <button
                key={id}
                className={vista === id ? 'activo' : ''}
                onClick={() => setVista(id)}
              >
                {icon}
                {label}
              </button>
            ))}
          </nav>
          {vista === 'resumen' ? (
            <section className='bit-card bit-resumen'>
              <h2>¿Qué deseas registrar hoy?</h2>
              <p>
                Selecciona una acción rápida para el lote{' '}
                <strong>{lote.codigo}</strong>.
              </p>
              <div className='bit-acciones'>
                <button onClick={() => abrir('peso')}>
                  <IcScale size={21} />
                  <span>
                    Registrar peso<small>Controlar el crecimiento</small>
                  </span>
                </button>
                <button onClick={() => abrir('mortalidad')}>
                  <IcHeart size={21} />
                  <span>
                    Registrar mortalidad<small>Reportar aves fallecidas</small>
                  </span>
                </button>
                <button onClick={() => abrir('sanitario')}>
                  <IcDrop size={21} />
                  <span>
                    Registrar sanidad
                    <small>Vacunas, tratamientos o revisión</small>
                  </span>
                </button>
                <Link to='/consumos-diarios'>
                  <IcSeed size={21} />
                  <span>
                    Registrar consumo<small>Alimento y agua diaria</small>
                  </span>
                </Link>
              </div>
            </section>
          ) : vista === 'consumo' ? (
            <section className='bit-card'>
              <div className='bit-seccion-cab'>
                <div>
                  <h2>Consumos registrados</h2>
                  <p>
                    El detalle y el registro se gestionan en el módulo
                    especializado.
                  </p>
                </div>
                <Link className='bit-principal' to='/consumos-diarios'>
                  Ir a consumos diarios
                </Link>
              </div>
              {consumos.length === 0 ? (
                <p className='bit-vacio'>Aún no hay consumos para este lote.</p>
              ) : (
                <div className='bit-lista'>
                  {consumos.map((x) => (
                    <article key={x.id}>
                      <time>{formatearFecha(x.fecha)}</time>
                      <strong>
                        {Number(x.alimento_kg ?? 0).toLocaleString('es-CO')} kg
                        · {Number(x.agua_litros ?? 0).toLocaleString('es-CO')} L
                      </strong>
                      <span>
                        {x.tipo_alimento?.nombre ?? 'Sin tipo de alimento'}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className='bit-card'>
              <div className='bit-seccion-cab'>
                <div>
                  <h2>{ETIQUETA[vista]}</h2>
                  <p>Historial del lote {lote.codigo}.</p>
                </div>
                <button className='bit-principal' onClick={() => abrir(vista)}>
                  + Nuevo registro
                </button>
              </div>
              {filas.length === 0 ? (
                <p className='bit-vacio'>
                  Aún no hay registros en esta sección.
                </p>
              ) : (
                <div className='bit-lista'>
                  {filas.map((x) => (
                    <article key={x.id}>
                      <time>{formatearFecha(x.fecha)}</time>
                      <strong>{x.principal}</strong>
                      <span>{x.detalle}</span>
                      <button onClick={() => borrar(vista, x.id)}>
                        Eliminar
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
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
