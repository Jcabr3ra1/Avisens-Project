import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { logout } from '@shared/api'
import { mensajeDeError } from '@shared/utils/errores'
import Cargando from '@shared/ui/Estados/Cargando'
import AvatarUsuario from '@app/layout/AvatarUsuario'
import { cambiarPasswordPropia, obtenerPerfil } from './api/perfil'
import { errorDeCambio, fortaleza, type PerfilCuenta } from './model/perfil'
import '@shared/ui/admin/AdminKit.css'
import './PerfilPage.css'

const FECHA = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' })
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
      <input id={id} type={visible ? 'text' : 'password'} value={valor} onChange={(evento) => onCambiar(evento.target.value)} autoComplete={autoComplete} maxLength={72} />
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

  return (
    <div className="page-container adm-page per-page">
      <header className="per-cabecera">
        <span className="adm-eyebrow">
          <span className="adm-eyebrow-punto" aria-hidden="true" />
          Tu cuenta
        </span>
        <h1 className="per-titulo">Mi perfil</h1>
        <p className="per-subtitulo">Tus datos de acceso y la seguridad de tu cuenta.</p>
      </header>

      {errorCarga && <div className="adm-alerta" role="alert"><span>{errorCarga}</span></div>}

      {!perfil && !errorCarga ? (
        <Cargando texto="Cargando tu perfil…" />
      ) : perfil && (
        <div className="per-cuerpo">
          <section className="per-tarjeta" aria-labelledby="per-datos-titulo">
            <div className="per-identidad">
              <span className="per-avatar" aria-hidden="true"><AvatarUsuario nombre={perfil.nombre_completo} tamano={72} /></span>
              <div>
                <h2 id="per-datos-titulo">{perfil.nombre_completo}</h2>
                <p>@{perfil.username} · {perfil.rol}</p>
              </div>
            </div>
            <dl className="per-datos">
              <div><dt>Correo</dt><dd>{perfil.email ?? 'No registrado'}</dd></div>
              <div><dt>Teléfono</dt><dd>{perfil.telefono ?? 'No registrado'}</dd></div>
              <div><dt>Organización</dt><dd>{perfil.organizacion?.nombre ?? 'Plataforma Avisens'}</dd></div>
              <div><dt>Cuenta creada</dt><dd>{fecha(perfil.fecha_creacion)}</dd></div>
              <div><dt>Último ingreso</dt><dd>{fecha(perfil.fecha_ultimo_login, FECHA_HORA)}</dd></div>
              <div><dt>Contraseña cambiada</dt><dd>{fecha(perfil.fecha_ultimo_cambio_password)}</dd></div>
            </dl>
            <p className="per-nota">¿Algún dato está mal? Pídele al administrador que lo corrija.</p>
          </section>

          <section className="per-tarjeta" aria-labelledby="per-seguridad-titulo">
            <h2 id="per-seguridad-titulo">Cambiar contraseña</h2>
            <p className="per-ayuda">Al guardar se cerrarán todas tus sesiones y tendrás que entrar de nuevo.</p>
            <form className="per-formulario" onSubmit={(evento) => void guardar(evento)} noValidate>
              <CampoClave id="per-actual" etiqueta="Contraseña actual" valor={actual} onCambiar={setActual} autoComplete="current-password" visible={visible} />
              <CampoClave id="per-nueva" etiqueta="Nueva contraseña" valor={nueva} onCambiar={setNueva} autoComplete="new-password" visible={visible} />
              {nueva && (
                <div className={`per-fortaleza per-fortaleza--${nivel.nivel}`} aria-live="polite">
                  <span className="per-fortaleza-barras" aria-hidden="true"><i /><i /><i /></span>
                  <span>{nivel.etiqueta}</span>
                </div>
              )}
              <CampoClave id="per-confirmar" etiqueta="Confirma la nueva contraseña" valor={confirmacion} onCambiar={setConfirmacion} autoComplete="new-password" visible={visible} />
              <label className="per-mostrar">
                <input type="checkbox" checked={visible} onChange={(evento) => setVisible(evento.target.checked)} />
                Mostrar contraseñas
              </label>
              {error && <p className="per-error" role="alert">{error}</p>}
              <button type="submit" className="adm-btn adm-btn--primario per-guardar" disabled={guardando} aria-busy={guardando}>
                {guardando ? 'Guardando…' : 'Guardar nueva contraseña'}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default PerfilPage
