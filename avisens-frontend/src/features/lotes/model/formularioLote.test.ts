import { describe, expect, it } from 'vitest'
import type { LineaGenetica } from '../api/lineas-geneticas'
import {
  MARCAS_ALIMENTO,
  SEXOS_LOTE,
  actualizarPayloadLote,
  crearFormularioLote,
  crearPayloadLote,
  opcionesLineaGenetica,
  tieneCurvaObjetivo,
  type FormularioLoteDatos,
} from './formularioLote'

describe('formulario de lote sin proveedor', () => {
  it('crea un formulario sin proveedor preseleccionado', () => {
    expect(crearFormularioLote(7).proveedor_id).toBeNull()
  })

  it('omite el proveedor al crear cuando aún no se conoce', () => {
    const formulario = crearFormularioLote(7)
    formulario.cantidad_inicial = 100

    expect(crearPayloadLote(formulario)).not.toHaveProperty('proveedor_id')
  })

  it('envía null al editar para retirar un proveedor ya asignado', () => {
    const formulario = crearFormularioLote(7)
    formulario.cantidad_inicial = 100

    expect(actualizarPayloadLote(formulario).proveedor_id).toBeNull()
  })
})

describe('formulario de lote sin línea genética', () => {
  it('crea un formulario sin línea genética preseleccionada', () => {
    expect(crearFormularioLote(7).linea_genetica_id).toBeNull()
  })

  it('omite la línea genética al crear cuando aún no se conoce', () => {
    const formulario = crearFormularioLote(7)
    formulario.cantidad_inicial = 100

    expect(crearPayloadLote(formulario)).not.toHaveProperty('linea_genetica_id')
  })

  it('incluye la línea genética al crear cuando sí se eligió una', () => {
    const formulario = crearFormularioLote(7)
    formulario.cantidad_inicial = 100
    formulario.linea_genetica_id = 4

    expect(crearPayloadLote(formulario).linea_genetica_id).toBe(4)
  })
})

describe('actualizarPayloadLote y linea_genetica_id (edición)', () => {
  // Simula abrir la edición de un lote cuya línea genética ya era `idOriginal`
  // -- lineaGeneticaIdOriginal es justo lo que formularioDesdeLote() captura.
  function formularioEditando(idOriginal: number | null): FormularioLoteDatos {
    const formulario = crearFormularioLote(7)
    formulario.cantidad_inicial = 100
    formulario.linea_genetica_id = idOriginal
    formulario.lineaGeneticaIdOriginal = idOriginal
    return formulario
  }

  it('sin cambios, omite linea_genetica_id del PATCH -- aunque esa línea esté inactiva', () => {
    const formulario = formularioEditando(2)
    expect(actualizarPayloadLote(formulario)).not.toHaveProperty('linea_genetica_id')
  })

  it('si el usuario la desvincula, envía null', () => {
    const formulario = formularioEditando(2)
    formulario.linea_genetica_id = null
    expect(actualizarPayloadLote(formulario).linea_genetica_id).toBeNull()
  })

  it('si el usuario elige otra línea activa, envía el id nuevo', () => {
    const formulario = formularioEditando(2)
    formulario.linea_genetica_id = 5
    expect(actualizarPayloadLote(formulario).linea_genetica_id).toBe(5)
  })

  it('un lote sin línea previa a la que se le asigna una, la envía', () => {
    const formulario = formularioEditando(null)
    formulario.linea_genetica_id = 4
    expect(actualizarPayloadLote(formulario).linea_genetica_id).toBe(4)
  })
})

describe('opcionesLineaGenetica', () => {
  const activa: LineaGenetica = {
    id: 1,
    codigo: 'ross_308',
    nombre: 'Ross 308',
    descripcion: null,
    activo: true,
    fecha_actualizacion: '2026-09-18T00:00:00.000Z',
  }
  const inactiva: LineaGenetica = {
    id: 2,
    codigo: 'cobb_500',
    nombre: 'Cobb 500',
    descripcion: null,
    activo: false,
    fecha_actualizacion: '2026-09-18T00:00:00.000Z',
  }

  it('solo ofrece líneas activas cuando no hay una línea actual inactiva', () => {
    const opciones = opcionesLineaGenetica([activa, inactiva], null)
    expect(opciones).toEqual([{ id: 1, etiqueta: 'Ross 308' }])
  })

  it('mantiene visible la línea actual aunque esté inactiva, marcada como tal', () => {
    const opciones = opcionesLineaGenetica([activa, inactiva], 2)
    expect(opciones).toContainEqual({ id: 2, etiqueta: 'Cobb 500 (Inactiva)' })
  })

  it('nunca deja un valor seleccionado que no exista entre las opciones', () => {
    const opciones = opcionesLineaGenetica([activa, inactiva], 2)
    expect(opciones.some((opcion) => opcion.id === 2)).toBe(true)
  })

  it('una línea actual ya activa no se duplica', () => {
    const opciones = opcionesLineaGenetica([activa, inactiva], 1)
    expect(opciones.filter((opcion) => opcion.id === 1)).toHaveLength(1)
  })
})

describe('vocabulario del lote', () => {
  it('los sexos son los que tiene sembrados la curva objetivo', () => {
    // La curva se busca por (marca, sexo). Si el formulario deja escribir
    // 'Macho ' o 'M', no hay coincidencia y el lote se queda sin referencia
    // sin que nada lo avise.
    expect([...SEXOS_LOTE]).toEqual(['macho', 'hembra', 'mixto'])
  })

  it('se ofrecen las cuatro marcas que el backend acepta', () => {
    expect([...MARCAS_ALIMENTO]).toEqual(['italcol', 'solla', 'contegral', 'finca'])
  })
})

describe('tieneCurvaObjetivo', () => {
  it('solo italcol y solla tienen curva sembrada', () => {
    expect(tieneCurvaObjetivo('italcol')).toBe(true)
    expect(tieneCurvaObjetivo('solla')).toBe(true)
    expect(tieneCurvaObjetivo('contegral')).toBe(false)
    expect(tieneCurvaObjetivo('finca')).toBe(false)
  })

  it('no se deja engañar por mayúsculas ni espacios', () => {
    expect(tieneCurvaObjetivo(' Italcol ')).toBe(true)
  })
})
