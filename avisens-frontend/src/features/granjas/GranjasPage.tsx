// GranjasPage.tsx — Módulo de Granjas (EP-08 HU-34).
// CRUD real de granjas y galpones del propietario — mismo patrón que UsuariosPage:
// listar, crear, editar, activar/desactivar y eliminar, todo contra la API.
// El galpón "activo" (badge verde/gris) y su día de vida se derivan en el
// cliente cruzando el galpón con su lote en curso — eso no se guarda, se calcula.

import { useEffect, useState, type FormEvent, type MouseEvent } from 'react'
import { isAxiosError } from 'axios'
import {
  listarGranjas,
  crearGranja,
  actualizarGranja,
  activarGranja,
  desactivarGranja,
  eliminarGranjaPermanente,
  listarGalpones,
  crearGalpon,
  actualizarGalpon,
  activarGalpon,
  desactivarGalpon,
  eliminarGalponPermanente,
  listarLotes,
  type Granja,
  type CrearGranjaPayload,
  type Galpon,
  type CrearGalponPayload,
  type Lote,
} from '@shared/api'
import { IcPin } from '@shared/ui/icons/icons'
import './GranjasPage.css'

type EstadoGalpon = 'activo' | 'vacio'

// Un galpón con su lote activo (si tiene) resuelto — lo que la tabla necesita.
type GalponConLote = Galpon & {
  loteActivo: Lote | null
  estadoLote: EstadoGalpon
  diaVida: number
  areaM2: number | null
}

function diasDesde(fechaISO: string): number {
  const dias = Math.floor((Date.now() - new Date(fechaISO).getTime()) / 86_400_000)
  return Math.max(dias, 0)
}

// Traduce un error de axios a un mensaje legible (igual que en UsuariosPage).
function mensajeError(err: unknown, fallback: string): string {
  if (isAxiosError(err) && err.response) {
    if (err.response.status === 403) return 'No tienes permisos para esta acción.'
    const data = err.response.data as { message?: string | string[] }
    if (data?.message) return Array.isArray(data.message) ? data.message.join(', ') : data.message
  }
  return fallback
}

const FORM_GRANJA_INICIAL: CrearGranjaPayload = { nombre: '' }
const FORM_GALPON_INICIAL: Omit<CrearGalponPayload, 'granja_id'> = { codigo: '', nombre: '' }

// ─── Componente principal ─────────────────────────────────────────────────────
function GranjasPage() {
  const [granjas, setGranjas] = useState<Granja[]>([])
  const [galpones, setGalpones] = useState<Galpon[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // Granja expandida para ver sus galpones
  const [granjaExpandida, setGranjaExpandida] = useState<number | null>(null)

  // ── Modal de granja (crear/editar) ──
  const [modalGranja, setModalGranja] = useState(false)
  const [editandoGranjaId, setEditandoGranjaId] = useState<number | null>(null)
  const [formGranja, setFormGranja] = useState<CrearGranjaPayload>(FORM_GRANJA_INICIAL)
  const [guardandoGranja, setGuardandoGranja] = useState(false)
  const [errorFormGranja, setErrorFormGranja] = useState('')

  // Solo aplica al crear: cuántos galpones arrancar con y su capacidad de
  // aves, para no tener que darlos de alta uno por uno justo después.
  const [cantidadGalponesIniciales, setCantidadGalponesIniciales] = useState<number | ''>('')
  const [avesPorGalponInicial, setAvesPorGalponInicial] = useState<number | ''>('')

  // ── Modal de galpón (crear/editar) ──
  const [modalGalpon, setModalGalpon] = useState(false)
  const [granjaParaGalpon, setGranjaParaGalpon] = useState<number | null>(null)
  const [editandoGalponId, setEditandoGalponId] = useState<number | null>(null)
  const [formGalpon, setFormGalpon] = useState<Omit<CrearGalponPayload, 'granja_id'>>(FORM_GALPON_INICIAL)
  const [guardandoGalpon, setGuardandoGalpon] = useState(false)
  const [errorFormGalpon, setErrorFormGalpon] = useState('')

  // ── Menú ⋯ de acciones (compartido por granjas y galpones) ──
  const [menuGranja, setMenuGranja] = useState<{ granja: Granja; top: number; left: number } | null>(null)
  const [menuGalpon, setMenuGalpon] = useState<{ galpon: Galpon; top: number; left: number } | null>(null)

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const [granjasData, galponesData, lotesData] = await Promise.all([
        listarGranjas(),
        listarGalpones(),
        listarLotes(),
      ])
      setGranjas(granjasData)
      setGalpones(galponesData)
      setLotes(lotesData)
      setGranjaExpandida((actual) => actual ?? granjasData[0]?.id ?? null)
    } catch (err) {
      setError(mensajeError(err, 'No se pudieron cargar las granjas.'))
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  function galponesDe(granjaId: number): GalponConLote[] {
    return galpones
      .filter((g) => g.granja.id === granjaId)
      .map((g) => {
        const loteActivo = lotes.find((l) => l.galpon.id === g.id && l.estado === 'activo') ?? null
        return {
          ...g,
          loteActivo,
          estadoLote: loteActivo ? 'activo' : 'vacio',
          diaVida: loteActivo ? diasDesde(loteActivo.fecha_ingreso) : 0,
          areaM2: g.ancho_metros && g.largo_metros ? g.ancho_metros * g.largo_metros : null,
        }
      })
  }

  // Totales globales del propietario para el encabezado
  const totalGalpones = galpones.length
  const galponesActivos = galpones.filter((g) =>
    lotes.some((l) => l.galpon.id === g.id && l.estado === 'activo'),
  ).length
  const totalAves = lotes.filter((l) => l.estado === 'activo').reduce((s, l) => s + l.cantidad_inicial, 0)

  // ── Acciones: Granja ──
  function abrirCrearGranja() {
    setEditandoGranjaId(null)
    setFormGranja(FORM_GRANJA_INICIAL)
    setCantidadGalponesIniciales('')
    setAvesPorGalponInicial('')
    setErrorFormGranja('')
    setModalGranja(true)
  }

  function abrirEditarGranja(g: Granja) {
    setEditandoGranjaId(g.id)
    setFormGranja({
      nombre: g.nombre,
      direccion: g.direccion ?? undefined,
      municipio: g.municipio ?? undefined,
      departamento: g.departamento ?? undefined,
      latitud: g.latitud ?? undefined,
      longitud: g.longitud ?? undefined,
      area_total_m2: g.area_total_m2 ?? undefined,
    })
    setErrorFormGranja('')
    setModalGranja(true)
  }

  async function handleGuardarGranja(e: FormEvent) {
    e.preventDefault()
    setErrorFormGranja('')
    setGuardandoGranja(true)
    try {
      if (editandoGranjaId !== null) {
        await actualizarGranja(editandoGranjaId, formGranja)
      } else {
        const nueva = await crearGranja(formGranja)
        const cantidad = cantidadGalponesIniciales || 0
        for (let i = 1; i <= cantidad; i++) {
          await crearGalpon({
            granja_id: nueva.id,
            codigo: `GP-${String(i).padStart(2, '0')}`,
            nombre: `Galpón ${i}`,
            capacidad_aves: avesPorGalponInicial || undefined,
          })
        }
        setGranjaExpandida(nueva.id)
      }
      setModalGranja(false)
      await cargar()
    } catch (err) {
      setErrorFormGranja(mensajeError(err, `No se pudo ${editandoGranjaId !== null ? 'actualizar' : 'crear'} la granja.`))
    } finally {
      setGuardandoGranja(false)
    }
  }

  async function handleToggleActivaGranja(g: Granja) {
    try {
      if (g.activa) await desactivarGranja(g.id)
      else await activarGranja(g.id)
      await cargar()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cambiar el estado de la granja.'))
    }
  }

  async function handleEliminarGranja(g: Granja) {
    const ok = window.confirm(`¿Eliminar PERMANENTEMENTE la granja "${g.nombre}"?\nEsta acción no se puede deshacer.`)
    if (!ok) return
    try {
      await eliminarGranjaPermanente(g.id)
      await cargar()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo eliminar la granja.'))
    }
  }

  // ── Acciones: Galpón ──
  function abrirCrearGalpon(granjaId: number) {
    setGranjaParaGalpon(granjaId)
    setEditandoGalponId(null)
    setFormGalpon(FORM_GALPON_INICIAL)
    setErrorFormGalpon('')
    setModalGalpon(true)
  }

  function abrirEditarGalpon(g: Galpon) {
    setGranjaParaGalpon(g.granja.id)
    setEditandoGalponId(g.id)
    setFormGalpon({
      codigo: g.codigo,
      nombre: g.nombre,
      capacidad_aves: g.capacidad_aves ?? undefined,
      ancho_metros: g.ancho_metros ?? undefined,
      largo_metros: g.largo_metros ?? undefined,
      orientacion: g.orientacion ?? undefined,
      tipo_techo: g.tipo_techo ?? undefined,
    })
    setErrorFormGalpon('')
    setModalGalpon(true)
  }

  async function handleGuardarGalpon(e: FormEvent) {
    e.preventDefault()
    if (granjaParaGalpon === null) return
    setErrorFormGalpon('')
    setGuardandoGalpon(true)
    try {
      if (editandoGalponId !== null) {
        await actualizarGalpon(editandoGalponId, formGalpon)
      } else {
        await crearGalpon({ ...formGalpon, granja_id: granjaParaGalpon })
      }
      setModalGalpon(false)
      await cargar()
    } catch (err) {
      setErrorFormGalpon(mensajeError(err, `No se pudo ${editandoGalponId !== null ? 'actualizar' : 'crear'} el galpón.`))
    } finally {
      setGuardandoGalpon(false)
    }
  }

  async function handleToggleActivoGalpon(g: Galpon) {
    try {
      if (g.activo) await desactivarGalpon(g.id)
      else await activarGalpon(g.id)
      await cargar()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cambiar el estado del galpón.'))
    }
  }

  async function handleEliminarGalpon(g: Galpon) {
    const ok = window.confirm(`¿Eliminar PERMANENTEMENTE el galpón "${g.nombre}"?\nEsta acción no se puede deshacer.`)
    if (!ok) return
    try {
      await eliminarGalponPermanente(g.id)
      await cargar()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo eliminar el galpón.'))
    }
  }

  function abrirMenuGranja(e: MouseEvent, g: Granja) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuGranja({ granja: g, top: r.bottom + 4, left: r.right - 152 })
  }

  function abrirMenuGalpon(e: MouseEvent, g: Galpon) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuGalpon({ galpon: g, top: r.bottom + 4, left: r.right - 152 })
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

      {error && (
        <div className="grj-alert grj-alert--error" role="alert">
          {error}
        </div>
      )}

      {cargando ? (
        <p className="grj-cargando">Cargando granjas…</p>
      ) : (
        <>
          {/* ── Resumen global ──────────────────────────────────────────────── */}
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
              <span className="grj-stat-valor">{totalAves.toLocaleString()}</span>
              <span className="grj-stat-label">Aves totales</span>
            </div>
          </div>

          {/* ── Lista de granjas ─────────────────────────────────────────────── */}
          {granjas.length === 0 ? (
            <p className="grj-cargando">Aún no tienes granjas registradas. Crea la primera con el botón de arriba.</p>
          ) : (
            <div className="grj-lista">
              {granjas.map((granja) => (
                <div key={granja.id} className={`grj-card${granja.activa ? '' : ' grj-card--inactiva'}`}>
                  {/* Cabecera de la granja — click para expandir/colapsar + menú de acciones */}
                  <div className="grj-card-head">
                    <button
                      className="grj-card-head-clickable"
                      onClick={() => setGranjaExpandida(granjaExpandida === granja.id ? null : granja.id)}
                    >
                      <div className="grj-card-info">
                        <span className="grj-nombre">
                          {granja.nombre}
                          {!granja.activa && <span className="grj-tag-inactiva">Inactiva</span>}
                        </span>
                        <span className="grj-ubicacion">
                          <IcPin size={13} /> {granja.municipio ?? '—'}, {granja.departamento ?? '—'}
                        </span>
                      </div>
                      <div className="grj-card-meta">
                        <span>{galponesDe(granja.id).length} galpones</span>
                        <span>{granja.area_total_m2 ? `${granja.area_total_m2} m²` : '—'}</span>
                        <span className="grj-chevron">{granjaExpandida === granja.id ? '▲' : '▼'}</span>
                      </div>
                    </button>
                    <button className="btn-kebab" onClick={(e) => abrirMenuGranja(e, granja)} aria-label="Acciones de la granja">
                      ⋯
                    </button>
                  </div>

                  {/* Tabla de galpones — visible solo cuando la granja está expandida */}
                  {granjaExpandida === granja.id && (
                    <div className="grj-galpones">
                      <div className="grj-galpones-toolbar">
                        <button className="btn-ghost-sm" onClick={() => abrirCrearGalpon(granja.id)}>
                          + Nuevo galpón
                        </button>
                      </div>
                      <table className="grj-tabla">
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Nombre</th>
                            <th>Área (m²)</th>
                            <th>Capacidad</th>
                            <th>Aves actuales</th>
                            <th>Día de vida</th>
                            <th>Lote activo</th>
                            <th>Estado</th>
                            <th aria-label="Acciones"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {galponesDe(granja.id).length === 0 ? (
                            <tr>
                              <td colSpan={9} className="grj-cargando">
                                Esta granja aún no tiene galpones.
                              </td>
                            </tr>
                          ) : (
                            galponesDe(granja.id).map((g) => (
                              <FilaGalpon key={g.id} galpon={g} onAbrirMenu={abrirMenuGalpon} />
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Menú ⋯ de granja ─────────────────────────────────────────────────── */}
      {menuGranja && (
        <>
          <div className="menu-overlay" onClick={() => setMenuGranja(null)} />
          <div className="menu-dropdown" style={{ top: menuGranja.top, left: menuGranja.left }}>
            <button className="menu-item" onClick={() => { const g = menuGranja.granja; setMenuGranja(null); abrirEditarGranja(g) }}>
              Editar
            </button>
            <button className="menu-item" onClick={() => { const g = menuGranja.granja; setMenuGranja(null); handleToggleActivaGranja(g) }}>
              {menuGranja.granja.activa ? 'Desactivar' : 'Activar'}
            </button>
            <button className="menu-item menu-item-danger" onClick={() => { const g = menuGranja.granja; setMenuGranja(null); handleEliminarGranja(g) }}>
              Eliminar
            </button>
          </div>
        </>
      )}

      {/* ── Menú ⋯ de galpón ─────────────────────────────────────────────────── */}
      {menuGalpon && (
        <>
          <div className="menu-overlay" onClick={() => setMenuGalpon(null)} />
          <div className="menu-dropdown" style={{ top: menuGalpon.top, left: menuGalpon.left }}>
            <button className="menu-item" onClick={() => { const g = menuGalpon.galpon; setMenuGalpon(null); abrirEditarGalpon(g) }}>
              Editar
            </button>
            <button className="menu-item" onClick={() => { const g = menuGalpon.galpon; setMenuGalpon(null); handleToggleActivoGalpon(g) }}>
              {menuGalpon.galpon.activo ? 'Desactivar' : 'Activar'}
            </button>
            <button className="menu-item menu-item-danger" onClick={() => { const g = menuGalpon.galpon; setMenuGalpon(null); handleEliminarGalpon(g) }}>
              Eliminar
            </button>
          </div>
        </>
      )}

      {/* ── Modal: crear/editar granja ───────────────────────────────────────── */}
      {modalGranja && (
        <div className="modal-overlay" onClick={() => setModalGranja(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{editandoGranjaId !== null ? 'Editar granja' : 'Nueva granja'}</h2>
            <form className="modal-form" onSubmit={handleGuardarGranja}>
              <label className="campo">
                <span>Nombre</span>
                <input
                  value={formGranja.nombre}
                  onChange={(e) => setFormGranja({ ...formGranja, nombre: e.target.value })}
                  required
                />
              </label>
              <label className="campo">
                <span>Dirección <em>(opcional)</em></span>
                <input
                  value={formGranja.direccion ?? ''}
                  onChange={(e) => setFormGranja({ ...formGranja, direccion: e.target.value })}
                />
              </label>
              <div className="campo-fila">
                <label className="campo">
                  <span>Municipio <em>(opcional)</em></span>
                  <input
                    value={formGranja.municipio ?? ''}
                    onChange={(e) => setFormGranja({ ...formGranja, municipio: e.target.value })}
                  />
                </label>
                <label className="campo">
                  <span>Departamento <em>(opcional)</em></span>
                  <input
                    value={formGranja.departamento ?? ''}
                    onChange={(e) => setFormGranja({ ...formGranja, departamento: e.target.value })}
                  />
                </label>
              </div>
              <div className="campo-fila">
                <label className="campo">
                  <span>Latitud <em>(opcional)</em></span>
                  <input
                    type="number" step="any"
                    value={formGranja.latitud ?? ''}
                    onChange={(e) => setFormGranja({ ...formGranja, latitud: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </label>
                <label className="campo">
                  <span>Longitud <em>(opcional)</em></span>
                  <input
                    type="number" step="any"
                    value={formGranja.longitud ?? ''}
                    onChange={(e) => setFormGranja({ ...formGranja, longitud: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </label>
              </div>
              <label className="campo">
                <span>Área total (m²) <em>(opcional)</em></span>
                <input
                  type="number" step="any"
                  value={formGranja.area_total_m2 ?? ''}
                  onChange={(e) => setFormGranja({ ...formGranja, area_total_m2: e.target.value ? Number(e.target.value) : undefined })}
                />
              </label>

              {editandoGranjaId === null && (
                <div className="campo-fila">
                  <label className="campo">
                    <span>Número de galpones <em>(opcional)</em></span>
                    <input
                      type="number" min={0}
                      value={cantidadGalponesIniciales}
                      onChange={(e) => setCantidadGalponesIniciales(e.target.value ? Number(e.target.value) : '')}
                    />
                  </label>
                  <label className="campo">
                    <span>Aves por galpón <em>(opcional)</em></span>
                    <input
                      type="number" min={0}
                      value={avesPorGalponInicial}
                      onChange={(e) => setAvesPorGalponInicial(e.target.value ? Number(e.target.value) : '')}
                    />
                  </label>
                </div>
              )}

              {errorFormGranja && <p className="modal-error" role="alert">{errorFormGranja}</p>}

              <div className="modal-acciones">
                <button type="button" className="btn-ghost" onClick={() => setModalGranja(false)} disabled={guardandoGranja}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={guardandoGranja}>
                  {guardandoGranja ? 'Guardando…' : editandoGranjaId !== null ? 'Guardar cambios' : 'Crear granja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: crear/editar galpón ───────────────────────────────────────── */}
      {modalGalpon && (
        <div className="modal-overlay" onClick={() => setModalGalpon(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{editandoGalponId !== null ? 'Editar galpón' : 'Nuevo galpón'}</h2>
            <form className="modal-form" onSubmit={handleGuardarGalpon}>
              <div className="campo-fila">
                <label className="campo">
                  <span>Código</span>
                  <input
                    value={formGalpon.codigo}
                    onChange={(e) => setFormGalpon({ ...formGalpon, codigo: e.target.value })}
                    placeholder="galpon1"
                    required
                  />
                </label>
                <label className="campo">
                  <span>Nombre</span>
                  <input
                    value={formGalpon.nombre}
                    onChange={(e) => setFormGalpon({ ...formGalpon, nombre: e.target.value })}
                    required
                  />
                </label>
              </div>
              <label className="campo">
                <span>Capacidad de aves <em>(opcional)</em></span>
                <input
                  type="number"
                  value={formGalpon.capacidad_aves ?? ''}
                  onChange={(e) => setFormGalpon({ ...formGalpon, capacidad_aves: e.target.value ? Number(e.target.value) : undefined })}
                />
              </label>
              <div className="campo-fila">
                <label className="campo">
                  <span>Ancho (m) <em>(opcional)</em></span>
                  <input
                    type="number" step="any"
                    value={formGalpon.ancho_metros ?? ''}
                    onChange={(e) => setFormGalpon({ ...formGalpon, ancho_metros: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </label>
                <label className="campo">
                  <span>Largo (m) <em>(opcional)</em></span>
                  <input
                    type="number" step="any"
                    value={formGalpon.largo_metros ?? ''}
                    onChange={(e) => setFormGalpon({ ...formGalpon, largo_metros: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </label>
              </div>
              <div className="campo-fila">
                <label className="campo">
                  <span>Orientación <em>(opcional)</em></span>
                  <input
                    value={formGalpon.orientacion ?? ''}
                    onChange={(e) => setFormGalpon({ ...formGalpon, orientacion: e.target.value })}
                    placeholder="norte-sur"
                  />
                </label>
                <label className="campo">
                  <span>Tipo de techo <em>(opcional)</em></span>
                  <input
                    value={formGalpon.tipo_techo ?? ''}
                    onChange={(e) => setFormGalpon({ ...formGalpon, tipo_techo: e.target.value })}
                    placeholder="zinc"
                  />
                </label>
              </div>

              {errorFormGalpon && <p className="modal-error" role="alert">{errorFormGalpon}</p>}

              <div className="modal-acciones">
                <button type="button" className="btn-ghost" onClick={() => setModalGalpon(false)} disabled={guardandoGalpon}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={guardandoGalpon}>
                  {guardandoGalpon ? 'Guardando…' : editandoGalponId !== null ? 'Guardar cambios' : 'Crear galpón'}
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
function FilaGalpon({
  galpon,
  onAbrirMenu,
}: {
  galpon: GalponConLote
  onAbrirMenu: (e: MouseEvent, g: Galpon) => void
}) {
  const etiqueta: Record<EstadoGalpon, string> = {
    activo: 'Activo',
    vacio: 'Vacío',
  }

  return (
    <tr className={`grj-fila grj-fila--${galpon.estadoLote}${galpon.activo ? '' : ' grj-fila--desactivado'}`}>
      <td>
        <code>{galpon.codigo}</code>
      </td>
      <td>{galpon.nombre}{!galpon.activo && <span className="grj-tag-inactiva">Inactivo</span>}</td>
      <td>{galpon.areaM2 ? galpon.areaM2.toLocaleString() : '—'}</td>
      <td>{galpon.capacidad_aves ? galpon.capacidad_aves.toLocaleString() : '—'}</td>
      <td>{galpon.loteActivo ? galpon.loteActivo.cantidad_inicial.toLocaleString() : '—'}</td>
      <td>{galpon.diaVida > 0 ? `Día ${galpon.diaVida}` : '—'}</td>
      <td>{galpon.loteActivo?.codigo ?? '—'}</td>
      <td>
        <span className={`grj-estado grj-estado--${galpon.estadoLote}`}>
          <span className={`grj-dot grj-dot--${galpon.estadoLote}`} />
          {etiqueta[galpon.estadoLote]}
        </span>
      </td>
      <td className="col-acciones">
        <button className="btn-kebab" onClick={(e) => onAbrirMenu(e, galpon)} aria-label="Acciones del galpón">
          ⋯
        </button>
      </td>
    </tr>
  )
}

export default GranjasPage
