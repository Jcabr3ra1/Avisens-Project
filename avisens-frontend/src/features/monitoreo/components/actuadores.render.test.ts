// Render en el servidor (react-dom/server): sin jsdom ni Testing Library,
// que el proyecto no tiene instalados. Cubre lo que se ve en el primer
// render; los clics y el sondeo quedan para la prueba manual.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Dispositivo } from '@features/dispositivos/api/dispositivos'
import type { Sensor } from '@features/sensores/api/sensores'
import RelesDelGalpon from '@features/sensores/components/RelesDelGalpon'
import type { SensorVista } from '../hooks/useMonitoreoAmbiental'
import { ActuadoresGalpon } from './ActuadoresGalpon'
import { ControlActuadores } from './ControlActuadores'

function sesionComo(rol: string) {
  const datos = new Map<string, string>([['avisens_usuario', JSON.stringify({ id: 1, rol })]])
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => { datos.set(k, v) },
    removeItem: (k: string) => { datos.delete(k) },
  })
}

const vista = (parcial: Partial<SensorVista>): SensorVista => ({
  id: 1,
  codigo: 'REL-K1-G1-D10',
  canal: 'rele:k1',
  tipo: 'Bombillos de calefacción',
  unidad: 'estado',
  esEstado: true,
  sinCalibrar: false,
  variableUmbral: null,
  valor: 1,
  minUmbral: null,
  maxUmbral: null,
  estado: 'sin_umbral',
  ultimaLecturaTs: Date.now(),
  x: null,
  y: null,
  ...parcial,
})

const cuatroReles = [
  vista({ id: 1, canal: 'rele:k1', codigo: 'REL-K1-G1-D10', tipo: 'Bombillos de calefacción' }),
  vista({ id: 2, canal: 'rele:k2', codigo: 'REL-K2-G1-D10', tipo: 'Ventiladores' }),
  vista({ id: 3, canal: 'rele:k3', codigo: 'REL-K3-G1-D10', tipo: 'Extractores' }),
  vista({ id: 4, canal: 'rele:k4', codigo: 'REL-K4-G1-D10', tipo: 'Bomba de agua' }),
]

const sensorApi = (parcial: Partial<Sensor>): Sensor => ({
  id: 1,
  codigo: 'REL-K1-G1-D10',
  tipo: 'Bombillos de calefacción',
  canal: 'rele:k1',
  unidad_medida: 'estado',
  modelo: 'Relé K1',
  fabricante: null,
  coordenada_x: null,
  coordenada_y: null,
  altura_metros: null,
  fecha_instalacion: null,
  ultima_calibracion: null,
  proxima_calibracion: null,
  estado: 'activo',
  galpon: { id: 1, nombre: 'Galpón 1', granja: { id: 1, propietario_id: 5 } },
  dispositivo: { id: 10, nombre: 'ESP32 norte', codigo_topic: 'G1-ESP32-01' },
  ...parcial,
})

const esp32: Dispositivo = {
  id: 10,
  codigo_topic: 'G1-ESP32-01',
  nombre: 'ESP32 norte',
  version_firmware: null,
  estado: 'online',
  ip_local: null,
  ultima_conexion: null,
  activo: true,
  fecha_creacion: '2026-10-01T00:00:00.000Z',
  galpon: { id: 1, nombre: 'Galpón 1', granja: { id: 1, propietario_id: 5 } },
}

describe('Monitoreo → Actuadores', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('muestra los cuatro actuadores con su nombre y canal, y el acceso a la ficha', () => {
    sesionComo('Operario')
    const html = renderToStaticMarkup(
      createElement(ActuadoresGalpon, { galponId: 1, sensores: cuatroReles, onCambio: () => {} }),
    )
    for (const nombre of ['Bombillos de calefacción', 'Ventiladores', 'Extractores', 'Bomba de agua']) {
      expect(html).toContain(nombre)
    }
    for (const k of ['K1 · canal rele:k1', 'K2 · canal rele:k2', 'K3 · canal rele:k3', 'K4 · canal rele:k4']) {
      expect(html).toContain(k)
    }
    expect(html.match(/Ver ficha del actuador/g)).toHaveLength(4)
    // Reutiliza los controles existentes: mismas tres acciones por relé.
    expect(html.match(/>Encender</g)).toHaveLength(4)
    expect(html.match(/>Automático</g)).toHaveLength(4)
  })

  it('no afirma un estado actual sin informe del ESP32: lo dice explícitamente', () => {
    sesionComo('Propietario')
    const html = renderToStaticMarkup(
      createElement(ActuadoresGalpon, {
        galponId: 1,
        sensores: [vista({ valor: null, estado: 'offline' })],
        onCambio: () => {},
      }),
    )
    expect(html).toContain('Sin dato reciente')
    expect(html).toContain('El ESP32 no está reportando')
  })

  it('avisa de un relé antiguo sin canal y explica qué hacer', () => {
    sesionComo('Administrador')
    const html = renderToStaticMarkup(
      createElement(ActuadoresGalpon, {
        galponId: 1,
        sensores: [vista({ canal: null, codigo: 'REL-K2-G1-01', tipo: 'Ventiladores (K2)' })],
        onCambio: () => {},
      }),
    )
    expect(html).toContain('K2 · REL-K2-G1-01 · sin canal')
    expect(html).toContain('Registrar relés')
  })

  it('sin relés indica dónde registrarlos según el rol', () => {
    sesionComo('Administrador')
    const admin = renderToStaticMarkup(createElement(ActuadoresGalpon, { galponId: 1, sensores: [], onCambio: () => {} }))
    expect(admin).toContain('«Registrar relés»')
    sesionComo('Operario')
    const operario = renderToStaticMarkup(createElement(ActuadoresGalpon, { galponId: 1, sensores: [], onCambio: () => {} }))
    expect(operario).toContain('Pide al administrador')
  })

  it('las tarjetas sin función de ficha no muestran el enlace', () => {
    const html = renderToStaticMarkup(
      createElement(ControlActuadores, { galponId: 1, reles: cuatroReles, onOrdenFinalizada: () => {} }),
    )
    expect(html).not.toContain('Ver ficha del actuador')
  })
})

describe('Administración → Actuadores (relés K1-K4)', () => {
  beforeEach(() => sesionComo('Administrador'))
  afterEach(() => vi.unstubAllGlobals())

  const props = (parcial: Partial<Parameters<typeof RelesDelGalpon>[0]> = {}) => ({
    galponId: 1,
    dispositivos: [esp32],
    sensores: [
      sensorApi({ id: 1 }),
      sensorApi({ id: 2, canal: 'rele:k2', codigo: 'REL-K2-G1-D10', tipo: 'Ventiladores' }),
      // Un sensor de medida no aparece entre los actuadores.
      sensorApi({ id: 9, canal: 'gpio:4', codigo: 'TEMP-1', tipo: 'temperatura', unidad_medida: '°C' }),
    ],
    puedeGestionar: true,
    onCambio: () => {},
    ...parcial,
  })

  it('el administrador ve «Registrar relés» con el ESP32 del galpón ya elegido', () => {
    const html = renderToStaticMarkup(createElement(RelesDelGalpon, props()))
    expect(html).toContain('>Registrar relés</button>')
    expect(html).toMatch(/<option value="10" selected="">G1-ESP32-01 · ESP32 norte<\/option>/)
  })

  it('lista solo los actuadores, con canal, ESP32, código y acceso a la ficha editable', () => {
    const html = renderToStaticMarkup(createElement(RelesDelGalpon, props()))
    expect(html).toContain('<strong>K1</strong>')
    expect(html).toContain('<strong>K2</strong>')
    expect(html).not.toContain('TEMP-1')
    expect(html.match(/Ficha \/ editar/g)).toHaveLength(2)
  })

  it('sin permiso de gestión no ofrece registrar ni editar', () => {
    const html = renderToStaticMarkup(createElement(RelesDelGalpon, props({ puedeGestionar: false })))
    expect(html).not.toContain('Registrar relés</button>')
    expect(html).not.toContain('Ficha / editar')
    expect(html).toContain('>Ficha</button>')
  })

  it('sin ESP32 activo el botón queda deshabilitado', () => {
    const html = renderToStaticMarkup(createElement(RelesDelGalpon, props({ dispositivos: [] })))
    expect(html).toMatch(/<button type="button" class="cs-boton cs-boton--principal" disabled="">Registrar relés<\/button>/)
    expect(html).toContain('Sin ESP32 activo')
  })

  it('señala los relés antiguos sin canal', () => {
    const html = renderToStaticMarkup(createElement(RelesDelGalpon, props({
      sensores: [sensorApi({ id: 5, canal: null, codigo: 'REL-K3-G1-01', tipo: 'Extractores (K3)' })],
    })))
    expect(html).toContain('Sin canal')
    expect(html).toContain('Un relé antiguo no tiene canal')
  })
})
