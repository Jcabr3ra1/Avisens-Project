import { useId, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import Modal from '@shared/ui/Modal/Modal'
import { IcBell } from '@shared/ui/icons/icons'
import { mensajeDeError } from '@shared/utils/errores'
import type { PoliticaAlerta } from '../api/politicas-alerta'
import { usePoliticasAlerta, type DatosPolitica } from '../hooks/usePoliticasAlerta'
import {
  CANALES_POLITICA,
  MINUTOS_MAXIMOS,
  MINUTOS_MINIMOS,
  NIVELES_POLITICA,
  canalInicial,
  estadoDePolitica,
  minutosIniciales,
  politicaDeNivel,
  segundosDeMinutos,
  tiempoLegible,
  validarMinutos,
  type CanalPolitica,
  type NivelPolitica,
} from '../model/politicaAlerta'
import './ConfiguracionAlertas.css'

type Props = {
  granja: { id: number; nombre: string }
  onCerrar: () => void
}

// HU-25 · El propietario decide, por criticidad, por qué canal le avisan y
// cuánto tiempo tiene el equipo para atender la alerta antes de escalarla.
function ConfiguracionAlertas({ granja, onCerrar }: Props) {
  const { politicas, cargando, error, recargar, crear, actualizar, pausar, reactivar } = usePoliticasAlerta()

  return (
    <Modal
      titulo="Configuración de alertas"
      subtitulo={granja.nombre}
      icono={<IcBell size={18} aria-hidden="true" />}
      ancho="ancho"
      onCerrar={onCerrar}
      acciones={<button type="button" className="modal-btn" onClick={onCerrar}>Cerrar</button>}
    >
      <p className="pal-intro">
        Elige por qué canal quieres enterarte de cada tipo de alerta y cuánto tiempo
        tiene tu equipo para atenderla antes de que se escale.
      </p>

      {error ? (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void recargar()}>Reintentar</button>
        </div>
      ) : cargando && politicas.length === 0 ? (
        <div className="pal-lista" aria-busy="true">
          {NIVELES_POLITICA.map((nivel) => <div key={nivel.valor} className="pal-tarjeta pal-tarjeta--cargando" />)}
        </div>
      ) : (
        <div className="pal-lista">
          {NIVELES_POLITICA.map((nivel) => {
            const politica = politicaDeNivel(politicas, granja.id, nivel.valor)
            return (
              <TarjetaPolitica
                // La llave cambia con la política para que el formulario tome
                // los valores guardados después de crear o reactivar.
                key={`${nivel.valor}-${politica?.id ?? 'nueva'}-${politica?.fecha_actualizacion ?? ''}`}
                nivel={nivel}
                politica={politica}
                onCrear={(datos) => crear(granja.id, nivel.valor, datos)}
                onActualizar={actualizar}
                onPausar={pausar}
                onReactivar={reactivar}
              />
            )
          })}
        </div>
      )}

      <p className="pal-nota">
        Por ahora AVISENS guarda tu configuración. El aviso de prueba por cada canal
        llegará en una próxima actualización; mientras tanto el canal aparece como
        «sin verificar».
      </p>
    </Modal>
  )
}

type TarjetaProps = {
  nivel: NivelPolitica
  politica: PoliticaAlerta | null
  onCrear: (datos: DatosPolitica) => Promise<void>
  onActualizar: (id: number, datos: Partial<DatosPolitica> & { activa?: boolean }) => Promise<void>
  onPausar: (id: number) => Promise<void>
  onReactivar: (id: number) => Promise<void>
}

const ETIQUETA_ESTADO = {
  activa: 'Activa',
  pausada: 'Pausada',
  'sin-configurar': 'Sin configurar',
} as const

function TarjetaPolitica({ nivel, politica, onCrear, onActualizar, onPausar, onReactivar }: TarjetaProps) {
  const id = useId()
  const estado = estadoDePolitica(politica)
  const canalGuardado = canalInicial(politica)
  const minutosGuardados = minutosIniciales(politica, nivel)
  const [canal, setCanal] = useState<CanalPolitica>(canalGuardado)
  const [minutos, setMinutos] = useState(minutosGuardados)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const cambio = canal !== canalGuardado || minutos !== minutosGuardados
  const minutosValidos = validarMinutos(minutos) === null

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const problema = validarMinutos(minutos)
    if (problema) { setError(problema); return }
    const datos: DatosPolitica = { canal, tiempo_max_respuesta_seg: segundosDeMinutos(minutos) }
    setGuardando(true)
    setError('')
    try {
      if (!politica) {
        await onCrear(datos)
        toast.success(`Alertas de criticidad ${nivel.etiqueta.toLowerCase()} configuradas`)
      } else if (estado === 'pausada') {
        await onActualizar(politica.id, { ...datos, activa: true })
        toast.success(`Alertas de criticidad ${nivel.etiqueta.toLowerCase()} reactivadas`)
      } else {
        await onActualizar(politica.id, datos)
        toast.success('Cambios guardados')
      }
    } catch (fallo) {
      setError(mensajeDeError(fallo, 'No se pudo guardar la configuración.'))
    } finally {
      setGuardando(false)
    }
  }

  async function alternar() {
    if (!politica) return
    setGuardando(true)
    setError('')
    try {
      if (estado === 'activa') {
        await onPausar(politica.id)
        toast.success(`Avisos de criticidad ${nivel.etiqueta.toLowerCase()} pausados`)
      } else {
        await onReactivar(politica.id)
        toast.success(`Avisos de criticidad ${nivel.etiqueta.toLowerCase()} reactivados`)
      }
    } catch (fallo) {
      setError(mensajeDeError(fallo, 'No se pudo cambiar el estado.'))
    } finally {
      setGuardando(false)
    }
  }

  const textoGuardar = guardando
    ? 'Guardando…'
    : estado === 'sin-configurar'
      ? 'Activar avisos'
      : estado === 'pausada' && cambio
        ? 'Guardar y reactivar'
        : 'Guardar cambios'
  const puedeGuardar = !guardando && minutosValidos && (estado === 'sin-configurar' || cambio)

  return (
    <form
      className={`pal-tarjeta pal-tarjeta--${nivel.valor} is-${estado}`}
      onSubmit={(evento) => void guardar(evento)}
      aria-labelledby={`${id}-titulo`}
    >
      <header className="pal-cabecera">
        <div>
          <h3 id={`${id}-titulo`} className="pal-titulo">
            <span className="pal-punto" aria-hidden="true" />
            Criticidad {nivel.etiqueta.toLowerCase()}
          </h3>
          <p className="pal-descripcion">{nivel.descripcion}</p>
        </div>
        <div className="pal-chips">
          <span className={`pal-chip pal-chip--${estado}`}>{ETIQUETA_ESTADO[estado]}</span>
          {estado === 'activa' && !politica?.verificado && (
            <span className="pal-chip pal-chip--sin-verificar" title="Aún no se ha enviado un aviso de prueba por este canal">
              Sin verificar
            </span>
          )}
        </div>
      </header>

      <fieldset className="pal-canales" disabled={guardando}>
        <legend>Avisarme por</legend>
        <div className="pal-segmento">
          {CANALES_POLITICA.map((opcion) => (
            <label key={opcion.valor} className={`pal-opcion${canal === opcion.valor ? ' is-elegida' : ''}`}>
              <input
                type="radio"
                name={`${id}-canal`}
                value={opcion.valor}
                checked={canal === opcion.valor}
                onChange={() => setCanal(opcion.valor)}
              />
              {opcion.etiqueta}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="pal-tiempo">
        <span>Tiempo máximo para atenderla</span>
        <span className="pal-tiempo-campo">
          <input
            type="number"
            inputMode="numeric"
            min={MINUTOS_MINIMOS}
            max={MINUTOS_MAXIMOS}
            step={1}
            value={minutos}
            disabled={guardando}
            aria-invalid={!minutosValidos}
            aria-describedby={`${id}-ayuda`}
            onChange={(evento) => { setMinutos(evento.target.value); setError('') }}
          />
          <span className="pal-sufijo">min</span>
        </span>
        <small id={`${id}-ayuda`} className="pal-ayuda">
          {minutosValidos
            ? `Si nadie la atiende en ${tiempoLegible(Number(minutos))}, se escala.`
            : validarMinutos(minutos)}
        </small>
      </label>

      {error && <p className="modal-error" role="alert">{error}</p>}

      <div className="pal-acciones">
        {politica && (
          <button type="button" className="adm-btn adm-btn--secundario" onClick={() => void alternar()} disabled={guardando}>
            {estado === 'activa' ? 'Pausar avisos' : 'Reactivar'}
          </button>
        )}
        <button type="submit" className="adm-btn adm-btn--primario" disabled={!puedeGuardar}>
          {textoGuardar}
        </button>
      </div>
    </form>
  )
}

export default ConfiguracionAlertas
