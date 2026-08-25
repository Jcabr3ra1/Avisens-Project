// GranjasPage.tsx — Módulo de Granjas (EP-08 HU-34).
// Muestra las granjas del propietario y sus galpones, ambos contra la API real.
// Permite crear granjas (con sus galpones iniciales), editarlas, activarlas o
// desactivarlas, y gestionar los galpones de cada una (crear, editar, activar).

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import {
  listarGranjas, crearGranja, actualizarGranja, activarGranja, desactivarGranja,
  listarGalpones, crearGalpon, actualizarGalpon, activarGalpon, desactivarGalpon,
  type Granja, type CrearGranjaPayload,
  type Galpon, type CrearGalponPayload,
} from '@shared/api'
import { IcPin, IcSettings, IcPlus } from '@shared/ui/icons/icons'
import './GranjasPage.css'

const FORM_GRANJA_INICIAL: CrearGranjaPayload = {
  nombre: '',
  direccion: '',
  municipio: '',
  departamento: '',
  area_total_m2: undefined,
}

// Solo se usa en el modo "crear granja" para generar los galpones iniciales.
const GALPONES_INICIALES = { cantidad: 0, capacidadAves: undefined as number | undefined }

const FORM_GALPON_INICIAL = { codigo: '', nombre: '', capacidad_aves: undefined as number | undefined }

type ModalGranja = { modo: 'crear' } | { modo: 'editar'; granja: Granja }
type ModalGalpon = { modo: 'crear'; granjaId: number } | { modo: 'editar'; galpon: Galpon }

// Traduce un error de axios a un mensaje legible para el usuario.
function mensajeError(err: unknown, fallback: string): string {
  if (isAxiosError(err) && err.response) {
    if (err.response.status === 403) {
      return 'No tienes permisos para esta acción.'
    }
    const data = err.response.data as { message?: string | string[] }
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message
    }
  }
  return fallback
}

// ─── Componente principal ─────────────────────────────────────────────────────
function GranjasPage() {
  const [granjas, setGranjas] = useState<Granja[]>([])
  const [galpones, setGalpones] = useState<Galpon[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // Granja expandida para ver sus galpones
  const [granjaExpandida, setGranjaExpandida] = useState<number | null>(null)

  // Modal granja (crear / editar)
  const [modalGranja, setModalGranja] = useState<ModalGranja | null>(null)
  const [formGranja, setFormGranja] = useState<CrearGranjaPayload>(FORM_GRANJA_INICIAL)
  const [galponesIniciales, setGalponesIniciales] = useState(GALPONES_INICIALES)
  const [guardandoGranja, setGuardandoGranja] = useState(false)
  const [errorGranja, setErrorGranja] = useState('')

  // Modal galpón (crear / editar)
  const [modalGalpon, setModalGalpon] = useState<ModalGalpon | null>(null)
  const [formGalpon, setFormGalpon] = useState(FORM_GALPON_INICIAL)
  const [guardandoGalpon, setGuardandoGalpon] = useState(false)
  const [errorGalpon, setErrorGalpon] = useState('')

  async function cargarTodo() {
    setCargando(true)
    setError('')
    try {
      const [gr, gp] = await Promise.all([listarGranjas(), listarGalpones()])
      setGranjas(gr)
      setGalpones(gp)
    } catch (err) {
      setError(mensajeError(err, 'No se pudieron cargar las granjas.'))
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarTodo()
  }, [])

  const galponesPorGranja = useMemo(() => {
    const map = new Map<number, Galpon[]>()
    for (const g of galpones) {
      const lista = map.get(g.granja.id) ?? []
      lista.push(g)
      map.set(g.granja.id, lista)
    }
    return map
  }, [galpones])

  // Totales globales del propietario para el encabezado
  const totalGalpones = galpones.length
  const galponesActivos = useMemo(() => galpones.filter((g) => g.activo).length, [galpones])
  const capacidadTotal = useMemo(
    () => galpones.reduce((s, g) => s + (g.capacidad_aves ?? 0), 0),
    [galpones],
  )

  // ── Granja: crear / editar ──────────────────────────────────────────────────
  function abrirCrearGranja() {
    setFormGranja(FORM_GRANJA_INICIAL)
    setGalponesIniciales(GALPONES_INICIALES)
    setErrorGranja('')
    setModalGranja({ modo: 'crear' })
  }

  function abrirEditarGranja(granja: Granja) {
    setFormGranja({
      nombre: granja.nombre,
      direccion: granja.direccion ?? '',
      municipio: granja.municipio ?? '',
      departamento: granja.departamento ?? '',
      area_total_m2: granja.area_total_m2 ?? undefined,
    })
    setErrorGranja('')
    setModalGranja({ modo: 'editar', granja })
  }

  function actualizarCampoGranja<K extends keyof CrearGranjaPayload>(campo: K, valor: CrearGranjaPayload[K]) {
    setFormGranja((prev) => ({ ...prev, [campo]: valor }))
  }

  async function handleGuardarGranja(e: FormEvent) {
    e.preventDefault()
    if (!modalGranja) return
    setErrorGranja('')
    setGuardandoGranja(true)
    try {
      const payload = {
        nombre: formGranja.nombre,
        direccion: formGranja.direccion?.trim() || undefined,
        municipio: formGranja.municipio?.trim() || undefined,
        departamento: formGranja.departamento?.trim() || undefined,
        area_total_m2: formGranja.area_total_m2 || undefined,
      }
      if (modalGranja.modo === 'editar') {
        await actualizarGranja(modalGranja.granja.id, payload)
      } else {
        const nueva = await crearGranja(payload)
        for (let i = 1; i <= (galponesIniciales.cantidad || 0); i++) {
          await crearGalpon({
            granja_id: nueva.id,
            codigo: `GP-${String(i).padStart(2, '0')}`,
            nombre: `Galpón ${i}`,
            capacidad_aves: galponesIniciales.capacidadAves || undefined,
          })
        }
        setGranjaExpandida(nueva.id)
      }
      setModalGranja(null)
      await cargarTodo()
    } catch (err) {
      setErrorGranja(mensajeError(err, 'No se pudo guardar la granja.'))
    } finally {
      setGuardandoGranja(false)
    }
  }

  async function alternarActivaGranja(granja: Granja) {
    try {
      if (granja.activa) await desactivarGranja(granja.id)
      else await activarGranja(granja.id)
      await cargarTodo()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cambiar el estado de la granja.'))
    }
  }

  // ── Galpón: crear / editar ──────────────────────────────────────────────────
  function abrirCrearGalpon(granjaId: number) {
    setFormGalpon(FORM_GALPON_INICIAL)
    setErrorGalpon('')
    setModalGalpon({ modo: 'crear', granjaId })
  }

  function abrirEditarGalpon(galpon: Galpon) {
    setFormGalpon({
      codigo: galpon.codigo,
      nombre: galpon.nombre,
      capacidad_aves: galpon.capacidad_aves ?? undefined,
    })
    setErrorGalpon('')
    setModalGalpon({ modo: 'editar', galpon })
  }

  function actualizarCampoGalpon<K extends keyof typeof FORM_GALPON_INICIAL>(
    campo: K,
    valor: (typeof FORM_GALPON_INICIAL)[K],
  ) {
    setFormGalpon((prev) => ({ ...prev, [campo]: valor }))
  }

  async function handleGuardarGalpon(e: FormEvent) {
    e.preventDefault()
    if (!modalGalpon) return
    setErrorGalpon('')
    setGuardandoGalpon(true)
    try {
      const payload = {
        codigo: formGalpon.codigo,
        nombre: formGalpon.nombre,
        capacidad_aves: formGalpon.capacidad_aves || undefined,
      }
      if (modalGalpon.modo === 'editar') {
        await actualizarGalpon(modalGalpon.galpon.id, payload)
      } else {
        const cargaGalpon: CrearGalponPayload = { granja_id: modalGalpon.granjaId, ...payload }
        await crearGalpon(cargaGalpon)
      }
      setModalGalpon(null)
      await cargarTodo()
    } catch (err) {
      setErrorGalpon(mensajeError(err, 'No se pudo guardar el galpón.'))
    } finally {
      setGuardandoGalpon(false)
    }
  }

  async function alternarActivoGalpon(galpon: Galpon) {
    try {
      if (galpon.activo) await desactivarGalpon(galpon.id)
      else await activarGalpon(galpon.id)
      await cargarTodo()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cambiar el estado del galpón.'))
    }
  }

  return (
    <div className="page-container grj-page">

      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <header className="grj-header">
        <div>
          <h1 className="grj-title">Mis Granjas</h1>
          <p className="grj-sub">Gestión de granjas y galpones del propietario</p>
        </div>
        <button className="btn-primary" onClick={abrirCrearGranja}>+ Nueva granja</button>
      </header>

      {/* ── Resumen global ──────────────────────────────────────────────────── */}
      <div className="grj-resumen">
        <div className="grj-stat">
          <span className="grj-stat-valor">{granjas.length}</span>
          <span className="grj-stat-label">Granjas</span>
        </div>
        <div className="grj-stat">
          <span className="grj-stat-valor">{totalGalpones}</span>
          <span className="grj-stat-label">Galpones</span>
        </div>
        <div className="grj-stat">
          <span className="grj-stat-valor">{galponesActivos}</span>
          <span className="grj-stat-label">Activos</span>
        </div>
        <div className="grj-stat">
          <span className="grj-stat-valor">{capacidadTotal.toLocaleString()}</span>
          <span className="grj-stat-label">Capacidad (aves)</span>
        </div>
      </div>

      {error && <div className="grj-alert" role="alert">{error}</div>}

      {/* ── Lista de granjas ─────────────────────────────────────────────────── */}
      {cargando ? (
        <p className="grj-empty">Cargando granjas…</p>
      ) : granjas.length === 0 ? (
        <div className="grj-vacio">
          <IcPin size={32} />
          <p className="grj-vacio-titulo">No tienes granjas registradas.</p>
          <p className="grj-vacio-sub">Crea la primera con el botón de arriba.</p>
        </div>
      ) : (
        <div className="grj-lista">
          {granjas.map((granja) => {
            const galponesGranja = galponesPorGranja.get(granja.id) ?? []
            const ubicacion = [granja.municipio, granja.departamento].filter(Boolean).join(', ')
            const expandida = granjaExpandida === granja.id
            return (
              <div key={granja.id} className={`grj-card ${granja.activa ? '' : 'grj-card--inactiva'}`}>

                {/* Cabecera de la granja — click para expandir/colapsar */}
                <div className="grj-card-head">
                  <button
                    type="button"
                    className="grj-card-titlebtn"
                    onClick={() => setGranjaExpandida(expandida ? null : granja.id)}
                  >
                    <div className="grj-card-info">
                      <span className="grj-nombre">{granja.nombre}</span>
                      {ubicacion && (
                        <span className="grj-ubicacion"><IcPin size={13} /> {ubicacion}</span>
                      )}
                    </div>
                  </button>
                  <div className="grj-card-meta">
                    <span>{galponesGranja.length} galpones</span>
                    {granja.area_total_m2 != null && <span>{granja.area_total_m2.toLocaleString()} m²</span>}
                    <button
                      type="button"
                      className={`grj-badge grj-badge--${granja.activa ? 'activa' : 'inactiva'}`}
                      onClick={() => alternarActivaGranja(granja)}
                      title={granja.activa ? 'Clic para desactivar' : 'Clic para activar'}
                    >
                      {granja.activa ? 'Activa' : 'Inactiva'}
                    </button>
                    <button
                      type="button"
                      className="grj-icon-btn"
                      title="Editar granja"
                      onClick={() => abrirEditarGranja(granja)}
                    >
                      <IcSettings size={14} />
                    </button>
                    <button
                      type="button"
                      className="grj-chevron-btn"
                      onClick={() => setGranjaExpandida(expandida ? null : granja.id)}
                    >
                      {expandida ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {/* Tabla de galpones — visible solo cuando la granja está expandida */}
                {expandida && (
                  <div className="grj-galpones">
                    {galponesGranja.length > 0 ? (
                      <table className="grj-tabla">
                        <thead>
                          <tr>
                            <th>Código</th><th>Nombre</th><th>Capacidad (aves)</th><th>Estado</th><th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {galponesGranja.map((g) => (
                            <FilaGalpon
                              key={g.id}
                              galpon={g}
                              onEditar={() => abrirEditarGalpon(g)}
                              onAlternar={() => alternarActivoGalpon(g)}
                            />
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="grj-galpones-vacio">Aún no tiene galpones registrados.</p>
                    )}
                    <button
                      type="button"
                      className="grj-agregar-galpon"
                      onClick={() => abrirCrearGalpon(granja.id)}
                    >
                      <IcPlus size={14} /> Agregar galpón
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal: crear / editar granja ───────────────────────────────────────── */}
      {modalGranja && (
        <div className="modal-overlay" onClick={() => setModalGranja(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{modalGranja.modo === 'editar' ? 'Editar granja' : 'Nueva granja'}</h2>

            <form className="modal-form" onSubmit={handleGuardarGranja}>
              <label className="campo">
                <span>Nombre</span>
                <input
                  value={formGranja.nombre}
                  onChange={(e) => actualizarCampoGranja('nombre', e.target.value)}
                  required
                />
              </label>

              <div className="campo-fila">
                <label className="campo">
                  <span>Municipio <em>(opcional)</em></span>
                  <input
                    value={formGranja.municipio}
                    onChange={(e) => actualizarCampoGranja('municipio', e.target.value)}
                  />
                </label>
                <label className="campo">
                  <span>Departamento <em>(opcional)</em></span>
                  <input
                    value={formGranja.departamento}
                    onChange={(e) => actualizarCampoGranja('departamento', e.target.value)}
                  />
                </label>
              </div>

              <label className="campo">
                <span>Dirección <em>(opcional)</em></span>
                <input
                  value={formGranja.direccion}
                  onChange={(e) => actualizarCampoGranja('direccion', e.target.value)}
                />
              </label>

              <label className="campo">
                <span>Área total en m² <em>(opcional)</em></span>
                <input
                  type="number"
                  min={0}
                  value={formGranja.area_total_m2 ?? ''}
                  onChange={(e) => actualizarCampoGranja('area_total_m2', e.target.value ? Number(e.target.value) : undefined)}
                />
              </label>

              {modalGranja.modo === 'crear' && (
                <div className="campo-fila">
                  <label className="campo">
                    <span>Número de galpones <em>(opcional)</em></span>
                    <input
                      type="number"
                      min={0}
                      value={galponesIniciales.cantidad || ''}
                      onChange={(e) =>
                        setGalponesIniciales((prev) => ({ ...prev, cantidad: e.target.value ? Number(e.target.value) : 0 }))
                      }
                    />
                  </label>
                  <label className="campo">
                    <span>Aves por galpón <em>(opcional)</em></span>
                    <input
                      type="number"
                      min={0}
                      value={galponesIniciales.capacidadAves ?? ''}
                      onChange={(e) =>
                        setGalponesIniciales((prev) => ({
                          ...prev,
                          capacidadAves: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                    />
                  </label>
                </div>
              )}

              {errorGranja && <p className="modal-error" role="alert">{errorGranja}</p>}

              <div className="modal-acciones">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setModalGranja(null)}
                  disabled={guardandoGranja}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={guardandoGranja}>
                  {guardandoGranja ? 'Guardando…' : modalGranja.modo === 'editar' ? 'Guardar cambios' : 'Crear granja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: crear / editar galpón ───────────────────────────────────────── */}
      {modalGalpon && (
        <div className="modal-overlay" onClick={() => setModalGalpon(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{modalGalpon.modo === 'editar' ? 'Editar galpón' : 'Nuevo galpón'}</h2>

            <form className="modal-form" onSubmit={handleGuardarGalpon}>
              <div className="campo-fila">
                <label className="campo">
                  <span>Código</span>
                  <input
                    value={formGalpon.codigo}
                    onChange={(e) => actualizarCampoGalpon('codigo', e.target.value)}
                    required
                  />
                </label>
                <label className="campo">
                  <span>Nombre</span>
                  <input
                    value={formGalpon.nombre}
                    onChange={(e) => actualizarCampoGalpon('nombre', e.target.value)}
                    required
                  />
                </label>
              </div>

              <label className="campo">
                <span>Capacidad de aves <em>(opcional)</em></span>
                <input
                  type="number"
                  min={0}
                  value={formGalpon.capacidad_aves ?? ''}
                  onChange={(e) => actualizarCampoGalpon('capacidad_aves', e.target.value ? Number(e.target.value) : undefined)}
                />
              </label>

              {errorGalpon && <p className="modal-error" role="alert">{errorGalpon}</p>}

              <div className="modal-acciones">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setModalGalpon(null)}
                  disabled={guardandoGalpon}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={guardandoGalpon}>
                  {guardandoGalpon ? 'Guardando…' : modalGalpon.modo === 'editar' ? 'Guardar cambios' : 'Crear galpón'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-componente: fila de galpón ──────────────────────────────────────────
function FilaGalpon({ galpon, onEditar, onAlternar }: { galpon: Galpon; onEditar: () => void; onAlternar: () => void }) {
  return (
    <tr className={`grj-fila ${galpon.activo ? 'grj-fila--activo' : 'grj-fila--inactivo'}`}>
      <td><code>{galpon.codigo}</code></td>
      <td>{galpon.nombre}</td>
      <td>{galpon.capacidad_aves != null ? galpon.capacidad_aves.toLocaleString() : '—'}</td>
      <td>
        <span className={`grj-estado grj-estado--${galpon.activo ? 'activo' : 'inactivo'}`}>
          <span className={`grj-dot grj-dot--${galpon.activo ? 'activo' : 'inactivo'}`} />
          {galpon.activo ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td className="grj-fila-acciones">
        <button type="button" className="grj-link-btn" onClick={onEditar}>Editar</button>
        <button type="button" className="grj-link-btn" onClick={onAlternar}>
          {galpon.activo ? 'Desactivar' : 'Activar'}
        </button>
      </td>
    </tr>
  )
}

export default GranjasPage
