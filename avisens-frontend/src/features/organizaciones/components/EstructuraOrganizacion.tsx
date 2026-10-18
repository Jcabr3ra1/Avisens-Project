import { useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { ROL_PROPIETARIO } from '@shared/auth/permisos'
import { IcChevronDown, IcEgg, IcEye, IcGrid, IcPin, IcPlus, IcSettings, IcThermo } from '@shared/ui/icons/icons'
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
  recargarDetalle: () => Promise<void>
  resaltadaId: number | null
  reveladaId: number | null
  reveladaVez: number
  onResaltar: (granjaId: number | null) => void
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

function EstructuraOrganizacion({ detalle, recargarDetalle, resaltadaId, reveladaId, reveladaVez, onResaltar }: Props) {
  const estructura = useEstructuraOrganizacion(detalle.granjas.map((granja) => granja.id))
  const [abiertoId, setAbiertoId] = useState<number | null>(null)
  const [monitoreo, setMonitoreo] = useState<{ id: number; nombre: string } | null>(null)
  const propietarios = detalle.usuarios
    .filter((usuario) => usuario.rol.nombre === ROL_PROPIETARIO)
    .map((usuario) => ({ id: usuario.id, nombre_completo: usuario.nombre_completo, activo: usuario.activo }))

  async function recargarTodo() {
    await Promise.all([recargarDetalle(), estructura.recargar()])
  }

  const formGranja = useFormularioGranja(async (datos, editandoId) => {
    if (editandoId === null) await crearGranja(datos)
    else await actualizarGranja(editandoId, datos)
    toast.success(editandoId === null ? 'Granja creada' : 'Granja actualizada')
    await recargarTodo()
  })

  const formGalpon = useFormularioGalpon(async (datos, editandoId) => {
    if (editandoId === null) {
      const nuevo = await crearGalpon(datos)
      setAbiertoId(nuevo.id)
    } else {
      await actualizarGalpon(editandoId, datos)
    }
    toast.success(editandoId === null ? 'Galpón registrado' : 'Galpón actualizado')
    await recargarTodo()
  })

  const formLote = useFormularioLote(async (datos: CrearLotePayload | ActualizarLotePayload, editandoId) => {
    if (editandoId === null) await crearLote(datos as CrearLotePayload)
    else await actualizarLote(editandoId, datos as ActualizarLotePayload)
    toast.success(editandoId === null ? 'Lote iniciado' : 'Lote actualizado')
    await recargarTodo()
  })

  const loteEnCurso = (galponId: number) =>
    estructura.lotes.find((lote) => lote.galpon.id === galponId && lote.estado === 'activo') ?? null

  return (
    <div className="est">
      <div className="est-barra">
        <p>Organiza cada granja con sus galpones, el lote que está criando y los sensores que lo vigilan.</p>
        <button type="button" className="est-boton est-boton--principal" onClick={() => formGranja.abrirCrear(propietarios[0]?.id)} disabled={propietarios.length === 0}>
          <IcPlus size={16} aria-hidden="true" /> Nueva granja
        </button>
      </div>

      {estructura.error && (
        <div className="adm-alerta" role="alert">
          <span>{estructura.error}</span>
          <button type="button" onClick={() => void estructura.recargar()}>Reintentar</button>
        </div>
      )}

      {detalle.granjas.length === 0 ? (
        <div className="est-vacio">
          <IcPin size={26} aria-hidden="true" />
          <h3>Esta organización aún no tiene granjas</h3>
          <p>Registra la primera granja para empezar a montar su estructura.</p>
        </div>
      ) : detalle.granjas.map((granja, indice) => {
        const galpones = estructura.galpones.filter((galpon) => galpon.granja.id === granja.id)
        const ubicacion = [granja.municipio, granja.departamento].filter(Boolean).join(', ') || granja.direccion || 'Ubicación sin registrar'
        const revelada = reveladaId === granja.id
        return (
          <article
            key={revelada ? `${granja.id}-${reveladaVez}` : granja.id}
            id={`org-granja-${granja.id}`}
            className={`est-granja org-aparece${revelada ? ' is-revelada' : ''}${resaltadaId === granja.id ? ' is-resaltada' : ''}`}
            style={{ '--orden': Math.min(indice, 6) } as CSSProperties}
            onMouseEnter={() => onResaltar(granja.id)}
            onMouseLeave={() => onResaltar(null)}
          >
            <header className="est-granja-cabecera">
              <span className="est-granja-icono" aria-hidden="true"><IcPin size={20} /></span>
              <div className="est-granja-ident">
                <h3>{granja.nombre}<span className={`est-estado${granja.activa ? ' is-activo' : ''}`}>{granja.activa ? 'Activa' : 'Inactiva'}</span></h3>
                <p>{ubicacion} · Propietario: <strong>{granja.propietario.nombre_completo}</strong></p>
              </div>
              <div className="est-granja-acciones">
                {granja.galpones.some((galpon) => galpon._count.sensores > 0) && (
                  <button type="button" className="est-boton" onClick={() => setMonitoreo({ id: granja.id, nombre: granja.nombre })}>
                    <IcEye size={15} aria-hidden="true" /> Monitoreo
                  </button>
                )}
                <button type="button" className="est-boton" onClick={() => formGranja.abrirEditar(aGranja(granja))}>
                  <IcSettings size={15} aria-hidden="true" /> Editar granja
                </button>
              </div>
            </header>

            <div className="est-galpones-cabecera">
              <h4>Galpones <span>{galpones.length}</span></h4>
              <button type="button" className="est-boton est-boton--suave" onClick={() => formGalpon.abrirCrear(granja.id)} disabled={!granja.activa}>
                <IcPlus size={15} aria-hidden="true" /> Nuevo galpón
              </button>
            </div>

            {estructura.cargando && galpones.length === 0 ? (
              <div className="est-esqueleto org-brilla" aria-hidden="true" />
            ) : galpones.length === 0 ? (
              <div className="est-vacio est-vacio--compacto">
                <p>Esta granja aún no tiene galpones. Registra el primero para iniciar un lote y conectar sus sensores.</p>
                <button type="button" className="est-boton est-boton--principal" onClick={() => formGalpon.abrirCrear(granja.id)} disabled={!granja.activa}>
                  <IcPlus size={15} aria-hidden="true" /> Registrar el primer galpón
                </button>
              </div>
            ) : (
              <ul className="est-galpones">
                {galpones.map((galpon) => (
                  <FilaGalpon
                    key={galpon.id}
                    galpon={galpon}
                    lote={loteEnCurso(galpon.id)}
                    sensores={granja.galpones.find((item) => item.id === galpon.id)?._count.sensores ?? 0}
                    controladores={granja.galpones.find((item) => item.id === galpon.id)?._count.dispositivo ?? 0}
                    abierto={abiertoId === galpon.id}
                    habilitado={detalle.activa && granja.activa && galpon.activo}
                    onAlternar={() => setAbiertoId((actual) => (actual === galpon.id ? null : galpon.id))}
                    onEditarGalpon={() => formGalpon.abrirEditar(galpon)}
                    onIniciarLote={() => formLote.abrirCrear(galpon.id)}
                    onEditarLote={(lote) => formLote.abrirEditar(lote)}
                  />
                ))}
              </ul>
            )}
          </article>
        )
      })}

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
          proveedores={estructura.proveedores}
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

function FilaGalpon({
  galpon, lote, sensores, controladores, abierto, habilitado, onAlternar, onEditarGalpon, onIniciarLote, onEditarLote,
}: {
  galpon: Galpon
  lote: Lote | null
  sensores: number
  controladores: number
  abierto: boolean
  habilitado: boolean
  onAlternar: () => void
  onEditarGalpon: () => void
  onIniciarLote: () => void
  onEditarLote: (lote: Lote) => void
}) {
  const idCuerpo = `est-galpon-${galpon.id}`
  return (
    <li className={`est-galpon${abierto ? ' is-abierto' : ''}${galpon.activo ? '' : ' is-inactivo'}`}>
      <button type="button" className="est-galpon-fila" aria-expanded={abierto} aria-controls={idCuerpo} onClick={onAlternar}>
        <span className="est-galpon-icono" aria-hidden="true"><IcGrid size={18} /></span>
        <span className="est-galpon-ident">
          <strong>{galpon.nombre}</strong>
          <small>{galpon.codigo}{galpon.capacidad_aves ? ` · capacidad ${galpon.capacidad_aves.toLocaleString('es-CO')} aves` : ''}</small>
        </span>
        <span className="est-galpon-resumen">
          {!galpon.activo && <span className="est-chip">Inactivo</span>}
          <span className={`est-chip${lote ? ' est-chip--lote' : ''}`}>
            <IcEgg size={13} aria-hidden="true" />
            {lote ? `Lote ${lote.codigo} · día ${diaDeLote(lote)}` : 'Sin lote'}
          </span>
          <span className={`est-chip${sensores > 0 ? ' est-chip--sensores' : ''}`}>
            <IcThermo size={13} aria-hidden="true" />
            {sensores === 1 ? '1 sensor' : `${sensores} sensores`}
          </span>
        </span>
        <IcChevronDown size={18} aria-hidden="true" className="est-galpon-flecha" />
      </button>

      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div
            id={idCuerpo}
            className="est-galpon-cuerpo"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.2, 0, 0, 1] }}
          >
            <div className="est-galpon-contenido">
              <section className="est-bloque">
                <header>
                  <h5>Lote en curso</h5>
                  {lote
                    ? <button type="button" className="est-enlace" onClick={() => onEditarLote(lote)}>Editar lote</button>
                    : null}
                </header>
                {lote ? (
                  <dl className="est-lote">
                    <div><dt>Código</dt><dd>{lote.codigo}</dd></div>
                    <div><dt>Ingreso</dt><dd>{fecha.format(new Date(lote.fecha_ingreso))} · día {diaDeLote(lote)}</dd></div>
                    <div><dt>Aves</dt><dd>{lote.cantidad_inicial.toLocaleString('es-CO')}</dd></div>
                    <div><dt>Línea genética</dt><dd>{lote.linea_genetica?.nombre ?? lote.raza ?? 'Sin registrar'}</dd></div>
                    {lote.proveedor && <div><dt>Proveedor</dt><dd>{lote.proveedor.nombre}</dd></div>}
                  </dl>
                ) : (
                  <div className="est-sin-lote">
                    <p>Este galpón no está criando ningún lote.</p>
                    <button type="button" className="est-boton est-boton--principal" onClick={onIniciarLote} disabled={!habilitado}>
                      <IcPlus size={15} aria-hidden="true" /> Iniciar lote
                    </button>
                  </div>
                )}
              </section>

              <section className="est-bloque est-iot" aria-label="Controladores y sensores">
                <header>
                  <h5>Controladores y sensores</h5>
                </header>
                <p className="est-iot-cifras">
                  <strong>{controladores}</strong> {controladores === 1 ? 'controlador' : 'controladores'}
                  <span aria-hidden="true">·</span>
                  <strong>{sensores}</strong> {sensores === 1 ? 'sensor' : 'sensores'}
                </p>
                <p className="est-nota">
                  {habilitado
                    ? 'Se instalan y configuran en Dispositivos, desde el riel verde.'
                    : 'La organización, la granja y el galpón deben estar activos para conectar sensores.'}
                </p>
              </section>

              <footer className="est-galpon-pie">
                <button type="button" className="est-enlace" onClick={onEditarGalpon}>
                  <IcSettings size={14} aria-hidden="true" /> Editar datos del galpón
                </button>
              </footer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

export default EstructuraOrganizacion
