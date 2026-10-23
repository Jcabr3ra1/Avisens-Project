import { confirmarAccion } from '@shared/ui/ConfirmarAccion/gestorConfirmacion'
import { useRef, useState, type DragEvent, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { IcCheck, IcPlus } from '@shared/ui/icons/icons'
import type { VersionFirmware } from '../api/firmware'
import { VERSION_VALIDA, siguienteVersion } from '../model/version'
import './PanelFirmware.css'

type ControladorFirmware = { id: number; codigo_topic: string; version_firmware: string | null }

type Props = {
  versiones: VersionFirmware[]
  controladores: ControladorFirmware[]
  cargando: boolean
  error: string
  onSubir: (archivo: File, version: string, notas: string) => Promise<boolean>
  onPublicar: (id: number) => Promise<boolean>
  onRetirar: (id: number) => Promise<boolean>
  onEliminar: (id: number) => Promise<boolean>
  onReintentar: () => void
}

const fecha = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
const megas = (bytes: number) => `${(bytes / 1_048_576).toLocaleString('es-CO', { maximumFractionDigits: 2 })} MB`

function Despliegue({ version, controladores, onRetirar }: {
  version: VersionFirmware
  controladores: ControladorFirmware[]
  onRetirar: () => void
}) {
  const alDia = controladores.filter((c) => c.version_firmware === version.version)
  const pendientes = controladores.filter((c) => c.version_firmware !== version.version)
  const fraccion = controladores.length === 0 ? 0 : alDia.length / controladores.length
  return (
    <section className="fw-despliegue" aria-labelledby="fw-despliegue-titulo">
      <div className="fw-despliegue-cabeza">
        <div>
          <span className="fw-rotulo">Publicada · se instala sola por Wi-Fi</span>
          <h3 id="fw-despliegue-titulo">v{version.version}</h3>
          {version.notas && <p>{version.notas}</p>}
        </div>
        <button type="button" className="fw-boton" onClick={onRetirar}>Pausar despliegue</button>
      </div>
      <div className="fw-barra" role="progressbar" aria-valuemin={0} aria-valuemax={controladores.length} aria-valuenow={alDia.length} aria-label="Controladores actualizados">
        <motion.span initial={{ width: 0 }} animate={{ width: `${fraccion * 100}%` }} transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }} />
      </div>
      <p className="fw-despliegue-cifra">
        <strong>{alDia.length} de {controladores.length}</strong> controladores ya la tienen
        {pendientes.length > 0 && ' · los demás la instalan en su próxima consulta (cada 30 s) si están en línea'}
      </p>
      {pendientes.length > 0 && (
        <ul className="fw-pendientes" aria-label="Controladores pendientes">
          {pendientes.map((c) => (
            <li key={c.id} title={c.codigo_topic}>
              {c.codigo_topic.replace(/^.*-ESP32-/, 'ESP32 ')}<b>v{c.version_firmware ?? '?'}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function PanelFirmware({ versiones, controladores, cargando, error, onSubir, onPublicar, onRetirar, onEliminar, onReintentar }: Props) {
  const entrada = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [version, setVersion] = useState('')
  const [notas, setNotas] = useState('')
  const [arrastrando, setArrastrando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState('')
  const publicada = versiones.find((item) => item.vigente) ?? null
  const versionValida = VERSION_VALIDA.test(version.trim())

  function elegir(nuevo: File | null | undefined) {
    if (!nuevo) return
    setArchivo(nuevo)
    setAviso('')
    if (!version) setVersion(siguienteVersion(versiones.map((v) => v.version)))
  }

  function soltar(evento: DragEvent<HTMLDivElement>) {
    evento.preventDefault()
    setArrastrando(false)
    elegir(evento.dataTransfer.files?.[0])
  }

  async function subir(evento: FormEvent) {
    evento.preventDefault()
    if (!archivo || !versionValida || enviando) return
    setEnviando(true)
    const ok = await onSubir(archivo, version.trim(), notas)
    setEnviando(false)
    if (!ok) return
    setAviso(`v${version.trim()} lista. Revísala y publícala cuando quieras que los controladores la instalen.`)
    setArchivo(null)
    setVersion('')
    setNotas('')
    if (entrada.current) entrada.current.value = ''
  }

  async function publicar(item: VersionFirmware) {
    if (!(await confirmarAccion({
      titulo: '¿Publicar esta versión?',
      entidad: `v${item.version}`,
      descripcion: 'Cada controlador en línea la descargará, verificará y se reiniciará solo en su próxima consulta.',
      textoConfirmar: 'Publicar versión',
      tono: 'aviso',
    }))) return
    if (await onPublicar(item.id)) setAviso(`v${item.version} publicada. Sigue el avance arriba.`)
  }

  async function eliminar(item: VersionFirmware) {
    if (!(await confirmarAccion({
      titulo: '¿Eliminar esta versión?',
      entidad: `v${item.version}`,
      descripcion: 'Se eliminará la versión seleccionada.',
      textoConfirmar: 'Eliminar versión',
      tono: 'peligro',
    }))) return
    await onEliminar(item.id)
  }

  return (
    <div className="fw" role="tabpanel" id="panel-firmware" aria-labelledby="tab-firmware">
      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onReintentar}>Reintentar</button>
        </div>
      )}

      {publicada
        ? <Despliegue version={publicada} controladores={controladores} onRetirar={() => void onRetirar(publicada.id)} />
        : !cargando && (
          <section className="fw-despliegue fw-despliegue--vacio">
            <span className="fw-rotulo">Sin versión publicada</span>
            <h3>Los controladores conservan el firmware que tienen</h3>
            <p>Sube una versión y publícala para que se instale sola por Wi-Fi, sin conectar ningún equipo al computador.</p>
          </section>
        )}

      <form className="fw-nueva" onSubmit={(evento) => void subir(evento)}>
        <div
          className={`fw-zona${arrastrando ? ' is-arrastrando' : ''}${archivo ? ' is-lista' : ''}`}
          onDragOver={(evento) => { evento.preventDefault(); setArrastrando(true) }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={soltar}
        >
          <input
            ref={entrada}
            id="fw-archivo"
            type="file"
            accept=".bin,application/octet-stream"
            className="sr-only"
            onChange={(evento) => elegir(evento.target.files?.[0])}
          />
          {archivo ? (
            <>
              <span className="fw-zona-icono is-ok" aria-hidden="true"><IcCheck size={20} /></span>
              <strong>{archivo.name}</strong>
              <span>{megas(archivo.size)} · <label htmlFor="fw-archivo" className="fw-enlace">cambiar archivo</label></span>
            </>
          ) : (
            <>
              <span className="fw-zona-icono" aria-hidden="true"><IcPlus size={20} /></span>
              <strong>Arrastra aquí el <code>firmware.bin</code></strong>
              <span>o <label htmlFor="fw-archivo" className="fw-enlace">búscalo en tu computador</label> · está en <code>esp32-firmware/.pio/build/esp32dev/</code></span>
            </>
          )}
        </div>

        {archivo && (
          <motion.div className="fw-datos" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
            <label className="fw-campo">
              <span>Versión</span>
              <input value={version} onChange={(evento) => setVersion(evento.target.value)} aria-invalid={!versionValida} disabled={enviando} />
              <small>Debe ser igual a <code>FIRMWARE_VERSION</code> en el código.</small>
            </label>
            <label className="fw-campo fw-campo--ancho">
              <span>Qué cambia</span>
              <input value={notas} onChange={(evento) => setNotas(evento.target.value)} placeholder="Ej.: mejora la reconexión al Wi-Fi" maxLength={500} disabled={enviando} />
            </label>
            <button type="submit" className="fw-boton fw-boton--principal fw-boton--grande" disabled={!versionValida || enviando}>
              {enviando ? 'Subiendo…' : 'Subir versión'}
            </button>
          </motion.div>
        )}
      </form>

      {aviso && <p className="fw-aviso" role="status">{aviso}</p>}

      <section aria-labelledby="fw-historial-titulo" className="fw-historial">
        <h3 id="fw-historial-titulo" className="fw-rotulo">Versiones</h3>
        {cargando ? (
          <p className="fw-vacio" role="status">Cargando versiones…</p>
        ) : versiones.length === 0 ? (
          <p className="fw-vacio">Todavía no has subido ninguna versión.</p>
        ) : (
          <ol className="fw-linea">
            {versiones.map((item) => (
              <li key={item.id} className={`fw-hito${item.vigente ? ' is-publicada' : ''}`}>
                <span className="fw-hito-punto" aria-hidden="true" />
                <div className="fw-hito-tarjeta">
                  <div className="fw-hito-cabeza">
                    <strong>v{item.version}</strong>
                    <span className={`fw-estado${item.vigente ? ' is-publicada' : ''}`}>{item.vigente ? 'Publicada' : 'Lista para publicar'}</span>
                  </div>
                  <p>{item.notas || 'Sin descripción de cambios.'}</p>
                  <span className="fw-hito-meta">
                    {fecha.format(new Date(item.fecha_creacion))} · {megas(item.tamano)} · <code title={item.sha256}>{item.sha256.slice(0, 10)}</code>
                  </span>
                  {!item.vigente && (
                    <div className="fw-hito-acciones">
                      <button type="button" className="fw-boton fw-boton--principal" onClick={() => void publicar(item)}>Publicar</button>
                      <button type="button" className="fw-boton fw-boton--peligro" onClick={() => void eliminar(item)}>Eliminar</button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

export default PanelFirmware
