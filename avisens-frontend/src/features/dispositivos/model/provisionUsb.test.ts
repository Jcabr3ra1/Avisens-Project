import { describe, expect, it, vi } from 'vitest'
import {
  construirComandoTokenSerial,
  enviarTokenAlPuerto,
  soportaProvisionUsb,
  type PuertoSerialWeb,
} from './provisionUsb'

describe('provisionUsb', () => {
  it('detecta si el navegador expone Web Serial API', () => {
    expect(soportaProvisionUsb(null)).toBe(false)
    expect(soportaProvisionUsb({})).toBe(false)
    expect(soportaProvisionUsb({ serial: { requestPort: () => Promise.resolve({} as PuertoSerialWeb) } })).toBe(true)
  })

  it('construye el comando serial validando longitud y espacios', () => {
    expect(construirComandoTokenSerial('  tok_1234567890abcdef  ')).toBe(
      'AVISENS_TOKEN:tok_1234567890abcdef\n',
    )
    expect(() => construirComandoTokenSerial('corto')).toThrow()
    expect(() => construirComandoTokenSerial('token con espacios 1234567890')).toThrow()
  })

  it('envía el token por el puerto y resuelve al recibir [Provision] TOKEN_OK', async () => {
    const escritos: string[] = []
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        setTimeout(() => {
          controller.enqueue(encoder.encode('=== Nodo ESP32 Avisens ===\n[Provision] TOKEN_OK\n'))
        }, 20)
      },
    })

    const writable = new WritableStream<Uint8Array>({
      write(chunk) {
        escritos.push(decoder.decode(chunk))
      },
    })

    const open = vi.fn().mockResolvedValue(undefined)
    const close = vi.fn().mockResolvedValue(undefined)

    await enviarTokenAlPuerto(
      { open, close, readable, writable },
      'tok_1234567890abcdef1234',
      { timeoutMs: 1000, intervaloReintentoMs: 200 },
    )

    expect(open).toHaveBeenCalledWith({ baudRate: 115200 })
    expect(escritos[0]).toBe('AVISENS_TOKEN:tok_1234567890abcdef1234\n')
    expect(close).toHaveBeenCalled()
  })

  it('propaga el error si el ESP32 devuelve [Provision] ERROR:', async () => {
    const encoder = new TextEncoder()
    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        setTimeout(() => {
          controller.enqueue(encoder.encode('[Provision] ERROR: no se pudo abrir la memoria NVS.\n'))
        }, 15)
      },
    })
    const writable = new WritableStream<Uint8Array>({ write() {} })
    const open = vi.fn().mockResolvedValue(undefined)
    const close = vi.fn().mockResolvedValue(undefined)

    await expect(
      enviarTokenAlPuerto(
        { open, close, readable, writable },
        'tok_1234567890abcdef1234',
        { timeoutMs: 1000 },
      ),
    ).rejects.toThrow('no se pudo abrir la memoria NVS.')
    expect(close).toHaveBeenCalled()
  })
})
