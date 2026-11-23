import { describe, expect, it } from 'vitest'
import type { GalponMonitoreoVista, SensorVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import type { FilaGalpon, ItemAtencionGranja } from './resumenGranja'
import { contarSensores, destinoPendiente, fraseDePendiente, semaforoGeneral, textoBotonPendiente, type EstadoSensores } from './semaforo'

const ahora = Date.parse('2026-11-21T15:00:00.000Z')

function item(parcial: Partial<ItemAtencionGranja>): ItemAtencionGranja {
  return {
    id: 'a', tipo: 'alerta', critico: false, etiqueta: 'Alerta', titulo: 'Temperatura alta',
    detalle: '', cuando: null, orden: 1, galponId: 1, galponNombre: 'Galpón 1', ...parcial,
  }
}

function fila(parcial: Partial<FilaGalpon> = {}): FilaGalpon {
  return {
    id: 1, nombre: 'Galpón 1', codigo: 'G-1', activo: true,
    lote: { codigo: 'L-1', dia: 9, aves: 500 }, alertas: 0, urgentes: 0, lecturas: [], ...parcial,
  }
}

const sensoresBien: EstadoSensores = { estado: 'listo', total: 3, vigentes: 3 }

function sensor(parcial: Partial<SensorVista>): SensorVista {
  return {
    id: 1, codigo: 'S-1', tipo: 'Temperatura', unidad: '°C', variableUmbral: 'temperatura', valor: 27,
    minUmbral: 24, maxUmbral: 30, estado: 'optimo', ultimaLecturaTs: ahora - 60_000,
    x: null, y: null, esEstado: false, sinCalibrar: false, ...parcial,
  }
}

function calor(parcial: Partial<ItemAtencionGranja> = {}): ItemAtencionGranja {
  return item({
    id: 'sensor-1', tipo: 'sensor', galponNombre: 'Galpón 2', galponId: 2,
    lectura: { clase: 'temperatura', tipo: 'Temperatura', valorTexto: '34 °C', direccion: 'alto', sinSenal: false },
    ...parcial,
  })
}

describe('semaforoGeneral', () => {
  it('sin pendientes, con lote y sensores reportando: verde', () => {
    const resultado = semaforoGeneral({ atencion: [], filas: [fila()], sensores: sensoresBien })
    expect(resultado.tono).toBe('ok')
    expect(resultado.titulo).toBe('Todo en orden')
    expect(resultado.frase).toBe('Ningún galpón requiere atención.')
    expect(resultado.textoBoton).toBeNull()
  })

  it('una alerta crítica gana a las de ámbar y se vuelve la frase principal', () => {
    const ambar = item({ id: 'ambar', titulo: 'Humedad alta', orden: 1 })
    const critica = calor({ id: 'critica', critico: true, orden: 9 })
    const resultado = semaforoGeneral({ atencion: [ambar, critica], filas: [fila()], sensores: sensoresBien })
    expect(resultado.tono).toBe('critico')
    expect(resultado.titulo).toBe('Atención urgente')
    expect(resultado.frase).toBe('Galpón 2: temperatura muy alta (34 °C)')
    expect(resultado.principal).toBe(critica)
    expect(resultado.otros).toEqual([ambar])
    expect(resultado.textoBoton).toBe('Revisar Galpón 2')
  })

  it('una alerta crítica gana también a "no sabemos cómo están"', () => {
    const critica = item({ id: 'c', critico: true, titulo: 'Amoníaco muy alto' })
    const resultado = semaforoGeneral({ atencion: [critica], filas: [fila()], sensores: { estado: 'listo', total: 0, vigentes: 0 } })
    expect(resultado.tono).toBe('critico')
  })

  it('pendientes sin urgencia: ámbar con la primera como causa y el resto en la lista', () => {
    const a = item({ id: 'a', titulo: 'Humedad alta' })
    const b = item({ id: 'b', titulo: 'Peso bajo', tipo: 'crecimiento', loteId: 7 })
    const resultado = semaforoGeneral({ atencion: [a, b], filas: [fila()], sensores: sensoresBien })
    expect(resultado.tono).toBe('atencion')
    expect(resultado.titulo).toBe('Requiere revisión')
    expect(resultado.otros).toHaveLength(1)
  })

  it('sin sensores en la granja: gris y lo explica sin culpar', () => {
    const resultado = semaforoGeneral({ atencion: [], filas: [fila()], sensores: { estado: 'listo', total: 0, vigentes: 0 } })
    expect(resultado.tono).toBe('sin_datos')
    expect(resultado.titulo).toBe('Sin datos de sensores')
    expect(resultado.frase).toBe('Los galpones no tienen sensores conectados.')
    expect(resultado.textoBoton).toBeNull()
  })

  it('con sensores pero ninguno con señal reciente: gris, y los avisos de "sin señal" quedan en la lista', () => {
    const sinSenal = item({
      id: 'sensor-9', tipo: 'sensor', galponNombre: 'Galpón 1',
      lectura: { clase: 'temperatura', tipo: 'Temperatura', valorTexto: '—', direccion: null, sinSenal: true },
    })
    const resultado = semaforoGeneral({ atencion: [sinSenal], filas: [fila()], sensores: { estado: 'listo', total: 2, vigentes: 0 } })
    expect(resultado.tono).toBe('sin_datos')
    expect(resultado.frase).toContain('Los sensores no reportan')
    expect(resultado.principal).toBe(sinSenal)
    expect(resultado.textoBoton).toBe('Revisar Galpón 1')
  })

  it('un sensor sin señal pero otros reportando es solo ámbar', () => {
    const sinSenal = item({
      id: 'sensor-9', tipo: 'sensor',
      lectura: { clase: 'temperatura', tipo: 'Temperatura', valorTexto: '—', direccion: null, sinSenal: true },
    })
    const resultado = semaforoGeneral({ atencion: [sinSenal], filas: [fila()], sensores: { estado: 'listo', total: 3, vigentes: 2 } })
    expect(resultado.tono).toBe('atencion')
    expect(resultado.frase).toBe('Galpón 1: sensor de temperatura sin señal')
  })

  it('error al consultar sensores: gris con su propia explicación', () => {
    const resultado = semaforoGeneral({ atencion: [], filas: [fila()], sensores: { estado: 'error' } })
    expect(resultado.tono).toBe('sin_datos')
    expect(resultado.frase).toContain('No fue posible consultar los sensores')
  })

  it('sin sensores pero con una alerta no urgente de otro tipo: ámbar, no gris', () => {
    const resultado = semaforoGeneral({
      atencion: [item({ titulo: 'Peso bajo', tipo: 'crecimiento' })],
      filas: [fila()],
      sensores: { estado: 'listo', total: 0, vigentes: 0 },
    })
    expect(resultado.tono).toBe('atencion')
  })

  it('mientras cargan los sensores o los pendientes no afirma que todo está bien', () => {
    expect(semaforoGeneral({ atencion: [], filas: [fila()], sensores: { estado: 'cargando' } }).tono).toBe('revisando')
    expect(semaforoGeneral({ atencion: [], filas: [fila()], sensores: sensoresBien, revisando: true }).tono).toBe('revisando')
  })

  it('mientras carga, un pendiente ya conocido sí se muestra', () => {
    const resultado = semaforoGeneral({ atencion: [item({})], filas: [fila()], sensores: { estado: 'cargando' } })
    expect(resultado.tono).toBe('atencion')
  })

  it('sin lote activo en ningún galpón: verde, sin lotes en curso', () => {
    const resultado = semaforoGeneral({ atencion: [], filas: [fila({ lote: null })], sensores: sensoresBien })
    expect(resultado.tono).toBe('ok')
    expect(resultado.titulo).toBe('Sin lotes en curso')
    expect(resultado.frase).toBe('Ningún galpón tiene un lote activo.')
  })

  it('sin lote y sin sensores no se vuelve gris: no hay nada que vigilar', () => {
    const resultado = semaforoGeneral({ atencion: [], filas: [fila({ lote: null })], sensores: { estado: 'listo', total: 0, vigentes: 0 } })
    expect(resultado.tono).toBe('ok')
  })

  it('con varios galpones basta uno con lote para hablar de pollos', () => {
    const resultado = semaforoGeneral({
      atencion: [],
      filas: [fila({ id: 1, lote: null }), fila({ id: 2, nombre: 'Galpón 2' })],
      sensores: sensoresBien,
    })
    expect(resultado.titulo).toBe('Todo en orden')
  })

  it('un galpón inactivo con lote no cuenta como producción', () => {
    const resultado = semaforoGeneral({ atencion: [], filas: [fila({ activo: false })], sensores: sensoresBien })
    expect(resultado.titulo).toBe('Sin lotes en curso')
  })
})

describe('fraseDePendiente', () => {
  it('temperatura alta: muy alta si es crítica, alta si no', () => {
    expect(fraseDePendiente(calor({ critico: true }))).toBe('Galpón 2: temperatura muy alta (34 °C)')
    expect(fraseDePendiente(calor())).toBe('Galpón 2: temperatura alta (34 °C)')
  })

  it('temperatura baja', () => {
    const frio = calor({ lectura: { clase: 'temperatura', tipo: 'Temperatura', valorTexto: '18 °C', direccion: 'bajo', sinSenal: false } })
    expect(fraseDePendiente(frio)).toBe('Galpón 2: temperatura baja (18 °C)')
    expect(fraseDePendiente({ ...frio, critico: true })).toBe('Galpón 2: temperatura muy baja (18 °C)')
  })

  it('humedad alta y baja', () => {
    const humedad = (direccion: 'alto' | 'bajo') =>
      calor({ lectura: { clase: 'humedad', tipo: 'Humedad', valorTexto: '85 %', direccion, sinSenal: false } })
    expect(fraseDePendiente(humedad('alto'))).toBe('Galpón 2: humedad alta (85 %)')
    expect(fraseDePendiente(humedad('bajo'))).toBe('Galpón 2: humedad baja (85 %)')
  })

  it('otro gas o medida fuera de rango', () => {
    const amoniaco = calor({ lectura: { clase: 'otra', tipo: 'Amoníaco', valorTexto: '30 ppm', direccion: 'alto', sinSenal: false } })
    expect(fraseDePendiente(amoniaco)).toBe('Galpón 2: amoníaco fuera de rango (30 ppm)')
  })

  it('sensor sin señal', () => {
    const sin = calor({ lectura: { clase: 'temperatura', tipo: 'Temperatura', valorTexto: '—', direccion: null, sinSenal: true } })
    expect(fraseDePendiente(sin)).toBe('Galpón 2: sensor de temperatura sin señal')
  })

  it('alertas y crecimiento llevan el nombre del galpón una sola vez', () => {
    expect(fraseDePendiente(item({ titulo: 'Se pasó la humedad' }))).toBe('Galpón 1: Se pasó la humedad')
    expect(fraseDePendiente(item({ titulo: 'Galpón 1 sin agua' }))).toBe('Galpón 1 sin agua')
    expect(fraseDePendiente(item({ galponNombre: undefined, titulo: 'Algo pasa' }))).toBe('Algo pasa')
  })
})

describe('textoBotonPendiente', () => {
  it('lleva el verbo y el galpón; el crecimiento va a la guía', () => {
    expect(textoBotonPendiente(item({ galponNombre: 'Galpón 2' }))).toBe('Revisar Galpón 2')
    expect(textoBotonPendiente(item({ galponNombre: undefined }))).toBe('Revisar')
    expect(textoBotonPendiente(item({ tipo: 'crecimiento', regla: 'peso_por_debajo' }))).toBe('Ver guía de crecimiento')
  })

  it('un pesaje pendiente pide registrar el pesaje, no abrir la guía', () => {
    expect(textoBotonPendiente(item({ tipo: 'crecimiento', regla: 'pesaje_atrasado', titulo: 'Pesaje pendiente' }))).toBe('Registrar pesaje')
  })
})

describe('destinoPendiente', () => {
  it('el pesaje pendiente abre la bitácora del galpón en la vista de peso', () => {
    const pesaje = item({ tipo: 'crecimiento', regla: 'pesaje_atrasado', galponId: 4, loteId: 9 })
    expect(destinoPendiente(pesaje, 2)).toBe('/granjas?granjaId=2&galpon=4&pestana=bitacora&vista=peso')
  })

  it('otros riesgos de crecimiento abren la guía del lote', () => {
    expect(destinoPendiente(item({ tipo: 'crecimiento', regla: 'peso_por_debajo', loteId: 9 }), 2)).toBe('/guia-crecimiento?lote=9')
    expect(destinoPendiente(item({ tipo: 'crecimiento', regla: 'mortalidad_alta' }), 2)).toBe('/guia-crecimiento')
  })

  it('alertas van a la pestaña de alertas y sensores a la de ambiente del galpón', () => {
    expect(destinoPendiente(item({ galponId: 3 }), 2)).toBe('/granjas?granjaId=2&galpon=3&pestana=alertas')
    expect(destinoPendiente(calor(), null)).toBe('/granjas?granjaId=&galpon=2&pestana=ambiente')
  })
})

describe('contarSensores', () => {
  function galpon(sensores: SensorVista[]): GalponMonitoreoVista {
    return { sensores } as GalponMonitoreoVista
  }

  it('sin galpones no hay sensores', () => {
    expect(contarSensores([], ahora)).toEqual({ total: 0, vigentes: 0 })
  })

  it('cuenta solo sensores de ambiente con lectura de hace menos de 30 minutos', () => {
    const resultado = contarSensores([
      galpon([
        sensor({ id: 1 }),
        sensor({ id: 2, ultimaLecturaTs: ahora - 3 * 3_600_000, estado: 'obsoleta' }),
        sensor({ id: 3, valor: null, estado: 'offline', ultimaLecturaTs: null }),
        sensor({ id: 4, esEstado: true }),
      ]),
      galpon([sensor({ id: 5 })]),
    ], ahora)
    expect(resultado).toEqual({ total: 4, vigentes: 2 })
  })
})
