export interface PuertoSerialWeb {
  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
  setSignals?(signals: { dataTerminalReady?: boolean; requestToSend?: boolean }): Promise<void>
  readable?: ReadableStream<Uint8Array> | null
  writable?: WritableStream<Uint8Array> | null
}

export interface NavegadorConSerial {
  serial?: {
    requestPort(): Promise<PuertoSerialWeb>
  }
}

export const PREFIJO_COMANDO_TOKEN = 'AVISENS_TOKEN:'
export const PREFIJO_COMANDO_TOKEN_LOCAL = 'AVISENS_TOKEN_LOCAL:'

export type DestinoToken = 'local' | 'produccion'

export function destinoDeLaPagina(hostname: string = typeof window !== 'undefined' ? window.location.hostname : ''): DestinoToken {
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.local') || /^127\./.test(host)) return 'local'
  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return 'local'
  return 'produccion'
}

export const MARCA_TOKEN_OK = '[Provision] TOKEN_OK'
export const MARCA_TOKEN_ERROR = '[Provision] ERROR:'

export function soportaProvisionUsb(nav: unknown = typeof navigator !== 'undefined' ? navigator : undefined): boolean {
  if (!nav || typeof nav !== 'object') return false
  const serial = (nav as NavegadorConSerial).serial
  return Boolean(serial && typeof serial.requestPort === 'function')
}

export function construirComandoTokenSerial(token: string, destino: DestinoToken = 'produccion'): string {
  const limpio = token.trim()
  if (limpio.length < 16 || limpio.length >= 128 || /\s/.test(limpio)) {
    throw new Error('El token no tiene un formato válido para enviarlo al ESP32.')
  }
  const prefijo = destino === 'local' ? PREFIJO_COMANDO_TOKEN_LOCAL : PREFIJO_COMANDO_TOKEN
  return `${prefijo}${limpio}\n`
}

export async function enviarTokenAlPuerto(
  puerto: PuertoSerialWeb,
  token: string,
  opciones?: { timeoutMs?: number; intervaloReintentoMs?: number; destino?: DestinoToken },
): Promise<void> {
  const comando = construirComandoTokenSerial(token, opciones?.destino)
  const timeoutMs = opciones?.timeoutMs ?? 10000
  const intervaloReintentoMs = opciones?.intervaloReintentoMs ?? 550

  try {
    await puerto.open({ baudRate: 115200 })
  } catch (err) {
    const nombre = err instanceof DOMException ? err.name : ''
    if (nombre === 'InvalidStateError') {
      throw new Error('El puerto USB ya está abierto en esta pestaña. Recarga la página e inténtalo de nuevo.')
    }
    throw new Error(
      'No se pudo abrir el puerto USB. Cierra el Monitor Serie de VS Code/PlatformIO (u otro programa que lo use) e inténtalo de nuevo.',
    )
  }

  // Con DTR/RTS inactivos el circuito de auto-reset deja al ESP32 en modo
  // ejecución normal (ni en reset ni en modo de carga de firmware).
  await puerto.setSignals?.({ dataTerminalReady: false, requestToSend: false }).catch(() => undefined)

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const reader = puerto.readable?.getReader()
  const writer = puerto.writable?.getWriter()

  if (!reader || !writer) {
    await puerto.close().catch(() => undefined)
    throw new Error('El puerto USB del ESP32 no permitió lectura/escritura.')
  }

  let acumulado = ''
  let terminado = false
  let temporizadorReintento: ReturnType<typeof setInterval> | undefined
  let temporizadorTimeout: ReturnType<typeof setTimeout> | undefined

  const escribirComando = async () => {
    if (terminado) return
    try {
      await writer.write(encoder.encode(comando))
    } catch {
      // Si el puerto sigue reiniciando, el siguiente ciclo reintentará.
    }
  }

  try {
    const promesaLectura = (async () => {
      while (!terminado) {
        const { value, done } = await reader.read()
        if (done) break
        if (value) {
          acumulado += decoder.decode(value, { stream: true })
          if (acumulado.includes(MARCA_TOKEN_OK)) {
            return
          }
          const indiceError = acumulado.indexOf(MARCA_TOKEN_ERROR)
          if (indiceError !== -1) {
            const detalle = acumulado.slice(indiceError + MARCA_TOKEN_ERROR.length).split(/\r?\n/)[0]?.trim()
            throw new Error(detalle || 'El ESP32 rechazó el token enviado.')
          }
        }
      }
      throw new Error('Se cerró la conexión USB antes de recibir confirmación del ESP32.')
    })()

    const promesaTimeout = new Promise<never>((_, reject) => {
      temporizadorTimeout = setTimeout(() => {
        reject(
          new Error(
            'El ESP32 no confirmó a tiempo. Verifica que tenga cargado el firmware actual y que el Monitor Serie de VS Code esté cerrado.',
          ),
        )
      }, timeoutMs)
    })

    await escribirComando()
    temporizadorReintento = setInterval(() => {
      void escribirComando()
    }, intervaloReintentoMs)

    await Promise.race([promesaLectura, promesaTimeout])
  } finally {
    terminado = true
    if (temporizadorReintento) clearInterval(temporizadorReintento)
    if (temporizadorTimeout) clearTimeout(temporizadorTimeout)
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
    writer.releaseLock()
    await puerto.close().catch(() => undefined)
  }
}

export async function provisionarTokenPorUsb(token: string, destino: DestinoToken = destinoDeLaPagina()): Promise<void> {
  if (!soportaProvisionUsb()) {
    throw new Error('Tu navegador no soporta conexión USB directa (Web Serial). Usa Chrome o Edge en computador.')
  }
  const nav = navigator as unknown as NavegadorConSerial
  const puerto = await nav.serial!.requestPort()
  await enviarTokenAlPuerto(puerto, token, { destino })
}
