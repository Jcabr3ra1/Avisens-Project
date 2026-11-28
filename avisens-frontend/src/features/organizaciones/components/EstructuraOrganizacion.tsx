import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ROL_PROPIETARIO } from '@shared/auth/permisos'
import {
  IcAlert,
  IcArrowRight,
  IcBarn,
  IcChip,
  IcEdit,
  IcEgg,
  IcEye,
  IcPin,
  IcPlus,
  IcSettings,
  IcThermo,
} from '@shared/ui/icons/icons'
import { actualizarGalpon, crearGalpon, type Galpon } from '@features/galpones/api/galpones'
import FormularioGalpon from '@features/galpones/components/FormularioGalpon'
import { useFormularioGalpon } from '@features/galpones/hooks/useFormularioGalpon'
import { actualizarGranja, crearGranja, type Granja } from '@features/granjas/api/granjas'
import FormularioGranja from '@features/granjas/components/FormularioGranja'
import { useFormularioGranja } from '@features/granjas/hooks/useFormularioGranja'
import { actualizarLote, crearLote, type ActualizarLotePayload, type CrearLotePayload, type Lote } from '@features/lotes/api/lotes'
import FormularioLote from '@features/lotes/components/FormularioLote'
import { useFormularioLote } from '@features/lotes/hooks/useFormularioLote'
import type { GranjaOrganizacionDetalle, OrganizacionDetalle } from '../api/organizaciones'
import { useEstructuraOrganizacion } from '../hooks/useEstructuraOrganizacion'
import MonitoreoGranja from './MonitoreoGranja'
import './EstructuraOrganizacion.css'

type Props = {
  detalle: OrganizacionDetalle
  granjaActivaId: number | null
  onSeleccionarGranja: (granjaId: number) => void
  recargarDetalle: () => Promise<void>
}

const fecha = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })

function diaDeLote(lote: Lote): number {
  const ingreso = new Date(lote.fecha_ingreso).getTime()
  return Math.max(1, Math.floor((Date.now() - ingreso) / 86_400_000) + 1)
}

function aGranja(granja: GranjaOrganizacionDetalle): Granja {
  return {
    id: granja.id,
    nombre: granja.nombre,
    direccion: granja.direccion,
    municipio: granja.municipio,
    departamento: granja.departamento,
    latitud: null,
    longitud: null,
    area_total_m2: granja.area_total_m2,
    activa: granja.activa,
    fecha_creacion: '',
    propietario: { id: granja.propietario.id, nombre_completo: granja.propietario.nombre_completo },
  }
}

function EstructuraOrganizacion({ detalle, granjaActivaId, onSeleccionarGranja, recargarDetalle }: Props) {
  const estructura = useEstructuraOrganizacion(detalle.granjas.map((granja) => granja.id))
  const [monitoreo, setMonitoreo] = useState<{ id: number; nombre: string } | null>(null)
  const propietarios = detalle.usuarios
    .filter((usuario) => usuario.rol.nombre === ROL_PROPIETARIO)
    .map((usuario) => ({ id: usuario.id, nombre_completo: usuario.nombre_completo, activo: usuario.activo }))

  async function recargarTodo() {
    await Promise.all([recargarDetalle(), estructura.recargar()])
  }

  const formGranja = useFormularioGranja(async (datos, editandoId) => {
    if (editandoId === null) {
      const nueva = await crearGranja(datos)
      onSeleccionarGranja(nueva.id)
    } else {
      await actualizarGranja(editandoId, datos)
    }
    toast.success(editandoId === null ? 'Granja creada' : 'Granja actualizada')
    await recargarTodo()
  })

  const formGalpon = useFormularioGalpon(async (datos, editandoId) => {
    if (editandoId === null) await crearGalpon(datos)
    else await actualizarGalpon(editandoId, datos)
    toast.success(editandoId === null ? 'Galpón registrado' : 'Galpón actualizado')
    await recargarTodo()
  })

  const formLote = useFormularioLote(async (datos: CrearLotePayload | ActualizarLotePayload, editandoId) => {
    if (editandoId === null) await crearLote(datos as CrearLotePayload)
    else await actualizarLote(editandoId, datos as ActualizarLotePayload)
    toast.success(editandoId === null ? 'Lote iniciado' : 'Lote actualizado')
    await recargarTodo()
  })

  const granjaActiva = detalle.granjas.find((item) => item.id === granjaActivaId) ?? detalle.granjas[0] ?? null
  const galponesDeGranja = granjaActiva
    ? estructura.galpones.filter((galpon) => galpon.granja.id === granjaActiva.id)
    : []
  const lotesEnCurso = (galponId: number) =>
    estructura.lotes
      .filter((lote) => lote.galpon.id === galponId && lote.estado === 'activo')
      .sort((a, b) => new Date(b.fecha_ingreso).getTime() - new Date(a.fecha_ingreso).getTime())

  const ubicacion = granjaActiva
    ? [granjaActiva.municipio, granjaActiva.departamento].filter(Boolean).join(', ')
      || granjaActiva.direccion
      || 'Ubicación sin registrar'
    : ''
  const tieneSensores = granjaActiva
    ? granjaActiva.galpones.some((galpon) => galpon._count.sensores > 0)
    : false

  return (
    <div className="est">
      {propietarios.length === 0 && (
        <div className="est-aviso-propietario" role="status">
          <IcAlert size={16} aria-hidden="true" />
          <span>Para crear una granja, primero registra al menos una persona con rol <strong>Propietario</strong> en este cliente.</span>
          <Link to="/usuarios" className="est-boton est-boton--suave">
            Ir a usuarios <IcArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      )}

      {estructura.error && (
        <div className="adm-alerta" role="alert">
          <span>{estructura.error}</span>
          <button type="button" onClick={() => void estructura.recargar()}>Reintentar</button>
        </div>
      )}

      {detalle.granjas.length === 0 ? (
        <div className="est-vacio">
          <IcBarn size={28} aria-hidden="true" />
          <h3>Este cliente aún no tiene granjas</h3>
          <p>Registra la primera granja para crear sus galpones, iniciar lotes y conectar sensores.</p>
          <button
            type="button"
            className="est-boton est-boton--principal"
            onClick={() => formGranja.abrirCrear(propietarios[0]?.id)}
            disabled={propietarios.length === 0}
          >
            <IcPlus size={16} aria-hidden="true" /> Registrar primera granja
          </button>
        </div>
      ) : granjaActiva ? (
        <>
          {detalle.granjas.length > 1 && (
            <div className="est-selector-barra">
              <div className="est-selector-pills" role="tablist" aria-label="Granjas del cliente">
                {detalle.granjas.map((granja) => {
                  const activa = granja.id === granjaActiva.id
                  return (
                    <button
                      key={granja.id}
                      type="button"
                      role="tab"
                      aria-selected={activa}
                      className={`est-selector-pill${activa ? ' is-activa' : ''}`}
                      onClick={() => onSeleccionarGranja(granja.id)}
                    >
                      <IcBarn size={14} aria-hidden="true" />
                      <span>{granja.nombre}</span>
                      <small>{granja.galpones.length}</small>
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                className="est-boton est-boton--suave"
                onClick={() => formGranja.abrirCrear(propietarios[0]?.id)}
                disabled={propietarios.length === 0}
              >
                <IcPlus size={15} aria-hidden="true" /> Nueva granja
              </button>
            </div>
          )}

          <header className="est-granja-resumen">
            <div className="est-granja-resumen-info">
              <div className="est-granja-titulo-fila">
                <h2>{granjaActiva.nombre}</h2>
                <span className={`est-estado${granjaActiva.activa ? ' is-activo' : ''}`}>
                  <span className="est-estado-punto" aria-hidden="true" />
                  {granjaActiva.activa ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <p className="est-granja-meta">
                <span className="est-meta-ubicacion">
                  <IcPin size={13} aria-hidden="true" /> {ubicacion}
                </span>
                <span aria-hidden="true">·</span>
                <span>Propietario: <strong>{granjaActiva.propietario.nombre_completo}</strong></span>
              </p>
            </div>

            <div className="est-granja-acciones">
              {tieneSensores && (
                <button
                  type="button"
                  className="est-boton est-boton--monitoreo"
                  onClick={() => setMonitoreo({ id: granjaActiva.id, nombre: granjaActiva.nombre })}
                >
                  <IcEye size={15} aria-hidden="true" /> Monitoreo
                </button>
              )}
              {detalle.granjas.length === 1 && (
                <button
                  type="button"
                  className="est-boton est-boton--suave"
                  onClick={() => formGranja.abrirCrear(propietarios[0]?.id)}
                  disabled={propietarios.length === 0}
                >
                  <IcPlus size={15} aria-hidden="true" /> Nueva granja
                </button>
              )}
              <button
                type="button"
                className="est-boton est-boton--secundario"
                onClick={() => formGranja.abrirEditar(aGranja(granjaActiva))}
              >
                <IcSettings size={15} aria-hidden="true" /> Editar granja
              </button>
              <button
                type="button"
                className="est-boton est-boton--principal"
                onClick={() => formGalpon.abrirCrear(granjaActiva.id)}
                disabled={!granjaActiva.activa}
              >
                <IcPlus size={15} aria-hidden="true" /> Nuevo galpón
              </button>
            </div>
          </header>

          {estructura.cargando && galponesDeGranja.length === 0 ? (
            <div className="est-galpones-grid" aria-hidden="true">
              <div className="est-esqueleto org-brilla" />
              <div className="est-esqueleto org-brilla" />
            </div>
          ) : galponesDeGranja.length === 0 ? (
            <div className="est-vacio est-vacio--compacto">
              <h3>Sin galpones en {granjaActiva.nombre}</h3>
              <p>Registra el primer galpón para iniciar un lote y conectar sensores.</p>
              <button
                type="button"
                className="est-boton est-boton--principal"
                onClick={() => formGalpon.abrirCrear(granjaActiva.id)}
                disabled={!granjaActiva.activa}
              >
                <IcPlus size={15} aria-hidden="true" /> Registrar primer galpón
              </button>
            </div>
          ) : (
            <ul className="est-galpones-grid" aria-label={`Galpones de ${granjaActiva.nombre}`}>
              {galponesDeGranja.map((galpon) => {
                const resumenGalpon = granjaActiva.galpones.find((item) => item.id === galpon.id)
                const sensores = resumenGalpon?._count.sensores ?? 0
                const controladores = resumenGalpon?._count.dispositivo ?? 0
                const lotesActivos = lotesEnCurso(galpon.id)
                const habilitado = detalle.activa && granjaActiva.activa && galpon.activo
                return (
                  <TarjetaGalpon
                    key={galpon.id}
                    galpon={galpon}
                    lotesActivos={lotesActivos}
                    sensores={sensores}
                    controladores={controladores}
                    habilitado={habilitado}
                    onEditarGalpon={() => formGalpon.abrirEditar(galpon)}
                    onIniciarLote={() => formLote.abrirCrear(galpon.id)}
                    onEditarLote={(item) => formLote.abrirEditar(item)}
                  />
                )
              })}
            </ul>
          )}
        </>
      ) : null}

      {monitoreo && (
        <MonitoreoGranja granjaId={monitoreo.id} granjaNombre={monitoreo.nombre} onCerrar={() => setMonitoreo(null)} />
      )}

      {formGranja.abierto && (
        <FormularioGranja
          form={formGranja.form}
          modoEdicion={formGranja.modoEdicion}
          esAdministrador
          propietarios={propietarios}
          cargandoPropietarios={false}
          errorPropietarios={propietarios.length === 0 ? 'Esta organización no tiene propietarios.' : ''}
          guardando={formGranja.guardando}
          error={formGranja.error}
          onCambiar={formGranja.cambiar}
          onGuardar={formGranja.guardar}
          onCerrar={formGranja.cerrar}
        />
      )}

      {formGalpon.abierto && (
        <FormularioGalpon
          form={formGalpon.form}
          modoEdicion={formGalpon.modoEdicion}
          granjas={detalle.granjas.filter((granja) => granja.id === formGalpon.form.granja_id).map(aGranja)}
          guardando={formGalpon.guardando}
          error={formGalpon.error}
          onCambiar={formGalpon.cambiar}
          onGuardar={formGalpon.guardar}
          onCerrar={formGalpon.cerrar}
        />
      )}

      {formLote.abierto && (
        <FormularioLote
          form={formLote.form}
          modoEdicion={formLote.modoEdicion}
          galpones={estructura.galpones}
          lotesActivosPorGalpon={new Map(
            estructura.lotes
              .filter((lote) => lote.estado === 'activo')
              .map((lote) => [lote.galpon.id, lote.codigo] as const),
          )}
          lineasGeneticas={estructura.lineasGeneticas}
          errorLineasGeneticas={estructura.errorLineas}
          guardando={formLote.guardando}
          error={formLote.error}
          onCambiar={formLote.cambiar}
          onGuardar={formLote.guardar}
          onCerrar={formLote.cerrar}
        />
      )}
    </div>
  )
}

function TarjetaGalpon({
  galpon,
  lotesActivos,
  sensores,
  controladores,
  habilitado,
  onEditarGalpon,
  onIniciarLote,
  onEditarLote,
}: {
  galpon: Galpon
  lotesActivos: Lote[]
  sensores: number
  controladores: number
  habilitado: boolean
  onEditarGalpon: () => void
  onIniciarLote: () => void
  onEditarLote: (lote: Lote) => void
}) {
  return (
    <li className={`est-card${galpon.activo ? '' : ' is-inactiva'}`}>
      <header className="est-card-top">
        <div className="est-card-ident">
          <div className="est-card-titulo-fila">
            <h3>{galpon.nombre}</h3>
            {!galpon.activo && <span className="est-etiqueta est-etiqueta--inactivo">Inactivo</span>}
          </div>
          <p className="est-card-sub">
            <code className="est-codigo">{galpon.codigo}</code>
            {galpon.capacidad_aves ? <span> · {galpon.capacidad_aves.toLocaleString('es-CO')} aves máx.</span> : null}
          </p>
        </div>
        <button type="button" className="est-card-editar" onClick={onEditarGalpon}>
          <IcEdit size={13} aria-hidden="true" /> Editar
        </button>
      </header>

      <div className="est-card-lote">
        {lotesActivos.length > 0 ? (
          <>
            <div className="est-card-lotes-lista">
              {lotesActivos.map((lote) => {
                const dia = diaDeLote(lote)
                return (
                  <div key={lote.id} className="est-card-lote-item">
                    <div className="est-card-lote-cabecera">
                      <span className="est-card-lote-badge">
                        <IcEgg size={13} aria-hidden="true" /> Lote activo · Día {dia}
                      </span>
                      <button type="button" className="est-enlace" onClick={() => onEditarLote(lote)}>
                        Editar lote
                      </button>
                    </div>
                    <dl className="est-card-lote-datos">
                      <div>
                        <dt>Aves</dt>
                        <dd>{lote.cantidad_inicial.toLocaleString('es-CO')}</dd>
                      </div>
                      <div>
                        <dt>Ingreso</dt>
                        <dd>{fecha.format(new Date(lote.fecha_ingreso))}</dd>
                      </div>
                      <div>
                        <dt>Línea</dt>
                        <dd>{lote.linea_genetica?.nombre ?? lote.raza ?? 'Sin registrar'}</dd>
                      </div>
                      <div>
                        <dt>Código</dt>
                        <dd><code className="est-codigo">{lote.codigo}</code></dd>
                      </div>
                    </dl>
                  </div>
                )
              })}
            </div>
            <div className="est-card-lote-pie">
              <small className="est-vacio">
                Cierra el lote activo para iniciar un nuevo ciclo en este galpón.
              </small>
            </div>
          </>
        ) : (
          <div className="est-card-sin-lote">
            <span>Sin lote en curso</span>
            <button type="button" className="est-boton est-boton--principal" onClick={onIniciarLote} disabled={!habilitado}>
              <IcPlus size={14} aria-hidden="true" /> Iniciar lote
            </button>
          </div>
        )}
      </div>

      <footer className="est-card-pie">
        <div className="est-card-iot">
          <span className={controladores > 0 ? 'is-activo' : ''}>
            <IcChip size={14} aria-hidden="true" /> {controladores} {controladores === 1 ? 'controlador' : 'controladores'}
          </span>
          <span className={sensores > 0 ? 'is-activo' : ''}>
            <IcThermo size={14} aria-hidden="true" /> {sensores} {sensores === 1 ? 'sensor' : 'sensores'}
          </span>
        </div>
        <Link to={`/dispositivos?galpon=${galpon.id}`} className="est-card-link">
          Dispositivos <IcArrowRight size={13} aria-hidden="true" />
        </Link>
      </footer>
    </li>
  )
}

export default EstructuraOrganizacion
