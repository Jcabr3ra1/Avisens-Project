import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { logout } from '@shared/api'
import { mensajeDeError } from '@shared/utils/errores'
import { IcArrowRight, IcCheck, IcSettings } from '@shared/ui/icons/icons'
import Cargando from '@shared/ui/Estados/Cargando'
import AvatarUsuario from '@app/layout/AvatarUsuario'
import { cambiarPasswordPropia, obtenerPerfil } from './api/perfil'
import { errorDeCambio, fortaleza, type PerfilCuenta } from './model/perfil'
import '@shared/ui/admin/AdminKit.css'
import './PerfilPage.css'

const FECHA = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' })
const FECHA_CORTA = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' })
const FECHA_HORA = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

function fecha(valor: string | null, formato = FECHA): string {
  if (!valor) return 'Sin registro'
  const instante = new Date(valor)
  return Number.isNaN(instante.getTime()) ? 'Sin registro' : formato.format(instante)
}

function CampoClave({ id, etiqueta, valor, onCambiar, autoComplete, visible }: {
  id: string
  etiqueta: string
  valor: string
  onCambiar: (valor: string) => void
  autoComplete: string
  visible: boolean
}) {
  return (
    <label className="per-campo" htmlFor={id}>
      <span>{etiqueta}</span>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={valor}
        onChange={(evento) => onCambiar(evento.target.value)}
        autoComplete={autoComplete}
        maxLength={72}
      />
    </label>
  )
}

function PerfilPage() {
  const navigate = useNavigate()
  const [perfil, setPerfil] = useState<PerfilCuenta | null>(null)
  const [errorCarga, setErrorCarga] = useState('')
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [visible, setVisible] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    obtenerPerfil()
      .then(setPerfil)
      .catch(() => setErrorCarga('No se pudo cargar tu perfil. Intenta de nuevo.'))
  }, [])

  const nivel = fortaleza(nueva)
  // QA 17-nov: el Propietario solo ve sus datos y pide otra contraseña al
  // administrador; el servidor también lo exige.
  const puedeCambiarClave = perfil !== null && perfil.rol !== 'Propietario'

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const problema = errorDeCambio(actual, nueva, confirmacion)
    setError(problema ?? '')
    if (problema) return
    setGuardando(true)
    try {
      const mensaje = await cambiarPasswordPropia(actual, nueva)
      toast.success(mensaje)
      await logout()
      navigate('/login', { replace: true })
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo cambiar la contraseña. Intenta de nuevo.'))
    } finally {
      setGuardando(false)
    }
  }

  async function cerrarSesion() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="page-container adm-page per-page">
      <header className="per-cabecera">
        <span className="adm-eyebrow">
          <span className="adm-eyebrow-punto" aria-hidden="true" />
          Tu cuenta
        </span>
        <h1 className="per-titulo">Mi perfil</h1>
        <p className="per-subtitulo">Tus datos de acceso, actividad reciente y seguridad de la cuenta.</p>
      </header>

      {errorCarga && <div className="adm-alerta" role="alert"><span>{errorCarga}</span></div>}

      {!perfil && !errorCarga ? (
        <Cargando texto="Cargando tu perfil…" />
      ) : perfil && (
        <div className="per-expediente">
          {/* ── Columna izquierda fija: Tarjeta de identidad (Diseño B) ── */}
          <aside className="per-perfil" aria-label="Resumen de tu cuenta">
            <div className="per-perfil-banda" aria-hidden="true">
              <span className="per-estado-pill">
                <span className="per-estado-punto" />
                Cuenta activa
              </span>
              <span className="per-rol-pill">{perfil.rol}</span>
            </div>

            <div className="per-perfil-cuerpo">
              <span className="per-avatar" aria-hidden="true">
                <AvatarUsuario nombre={perfil.nombre_completo} tamano={84} />
              </span>
              <h2 className="per-perfil-nombre">{perfil.nombre_completo}</h2>
              <p className="per-perfil-usuario">@{perfil.username}</p>
              <p className="per-perfil-org">{perfil.organizacion?.nombre ?? 'Plataforma Avisens'}</p>

              <dl className="per-perfil-metricas">
                <div>
                  <dt>Miembro desde</dt>
                  <dd>{fecha(perfil.fecha_creacion, FECHA_CORTA)}</dd>
                </div>
                <div>
                  <dt>Último ingreso</dt>
                  <dd>{fecha(perfil.fecha_ultimo_login, FECHA_HORA)}</dd>
                </div>
              </dl>

              <button
                type="button"
                className="adm-btn adm-btn--secundario per-salir"
                onClick={() => void cerrarSesion()}
              >
                Cerrar sesión
                <IcArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </aside>

          {/* ── Columna derecha: Tarjetas ejecutivas ── */}
          <div className="per-espacio">
            <section className="per-tarjeta" aria-labelledby="per-datos-titulo">
              <header className="per-tarjeta-cabecera">
                <div>
                  <span className="per-rotulo">Información personal</span>
                  <h2 id="per-datos-titulo">Datos de acceso y contacto</h2>
                </div>
                <span className="per-chip-ok">
                  <IcCheck size={12} aria-hidden="true" /> Verificado
                </span>
              </header>

              <dl className="per-datos">
                <div>
                  <dt>Nombre completo</dt>
                  <dd>{perfil.nombre_completo}</dd>
                </div>
                <div>
                  <dt>Usuario</dt>
                  <dd><code>@{perfil.username}</code></dd>
                </div>
                <div>
                  <dt>Correo electrónico</dt>
                  <dd>{perfil.email ?? <em className="per-sin-dato">No registrado</em>}</dd>
                </div>
                <div>
                  <dt>Teléfono</dt>
                  <dd>{perfil.telefono ?? <em className="per-sin-dato">No registrado</em>}</dd>
                </div>
                <div>
                  <dt>Organización</dt>
                  <dd>{perfil.organizacion?.nombre ?? 'Plataforma Avisens'}</dd>
                </div>
                <div>
                  <dt>Rol asignado</dt>
                  <dd>{perfil.rol}</dd>
                </div>
              </dl>
            </section>

            <section className="per-tarjeta" aria-labelledby="per-seguridad-titulo">
              <header className="per-tarjeta-cabecera">
                <div>
                  <span className="per-rotulo">Seguridad y acceso</span>
                  <h2 id="per-seguridad-titulo">
                    {puedeCambiarClave ? 'Cambiar contraseña' : 'Estado de seguridad'}
                  </h2>
                </div>
                <span className="per-icono-seguridad" aria-hidden="true">
                  <IcSettings size={16} />
                </span>
              </header>

              <dl className="per-datos per-datos--seguridad">
                <div>
                  <dt>Cuenta creada</dt>
                  <dd>{fecha(perfil.fecha_creacion)}</dd>
                </div>
                <div>
                  <dt>Último ingreso</dt>
                  <dd>{fecha(perfil.fecha_ultimo_login, FECHA_HORA)}</dd>
                </div>
                <div>
                  <dt>Último cambio de contraseña</dt>
                  <dd>{fecha(perfil.fecha_ultimo_cambio_password)}</dd>
                </div>
              </dl>

              {puedeCambiarClave ? (
                <>
                  <p className="per-ayuda">
                    Al guardar se cerrarán todas tus sesiones activas y tendrás que iniciar sesión de nuevo.
                  </p>
                  <form className="per-formulario" onSubmit={(evento) => void guardar(evento)} noValidate>
                    <CampoClave
                      id="per-actual"
                      etiqueta="Contraseña actual"
                      valor={actual}
                      onCambiar={setActual}
                      autoComplete="current-password"
                      visible={visible}
                    />
                    <div className="per-formulario-par">
                      <CampoClave
                        id="per-nueva"
                        etiqueta="Nueva contraseña"
                        valor={nueva}
                        onCambiar={setNueva}
                        autoComplete="new-password"
                        visible={visible}
                      />
                      <CampoClave
                        id="per-confirmar"
                        etiqueta="Confirma la nueva contraseña"
                        valor={confirmacion}
                        onCambiar={setConfirmacion}
                        autoComplete="new-password"
                        visible={visible}
                      />
                    </div>
                    {nueva && (
                      <div className={`per-fortaleza per-fortaleza--${nivel.nivel}`} aria-live="polite">
                        <span className="per-fortaleza-barras" aria-hidden="true"><i /><i /><i /></span>
                        <span>{nivel.etiqueta}</span>
                      </div>
                    )}
                    <label className="per-mostrar">
                      <input
                        type="checkbox"
                        checked={visible}
                        onChange={(evento) => setVisible(evento.target.checked)}
                      />
                      Mostrar contraseñas
                    </label>
                    {error && <p className="per-error" role="alert">{error}</p>}
                    <div className="per-formulario-pie">
                      <button
                        type="submit"
                        className="adm-btn adm-btn--primario per-guardar"
                        disabled={guardando}
                        aria-busy={guardando}
                      >
                        {guardando ? 'Guardando…' : 'Guardar nueva contraseña'}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="per-aviso-admin" role="note">
                  <span className="per-aviso-icono" aria-hidden="true">
                    <IcSettings size={16} />
                  </span>
                  <div>
                    <strong>Credenciales administradas por soporte</strong>
                    <p>
                      ¿Algún dato está desactualizado o necesitas cambiar tu contraseña? Solicítalo al
                      administrador de la plataforma para actualizarlo de forma segura.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  )
}

export default PerfilPage
