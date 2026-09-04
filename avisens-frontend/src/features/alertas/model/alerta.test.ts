import { describe, expect, it } from 'vitest'
import type { Alerta } from '../api/alertas'
import { esCriticidadAlta, etiquetaCriticidad, filtrarAlertas, obtenerResumenAlertas } from './alerta'

function alerta(criticidad: string, estado = 'abierta'): Alerta {
  return { criticidad, estado } as Alerta
}

describe('esCriticidadAlta', () => {
  it('reconoce los dos niveles graves que emite el backend', () => {
    expect(esCriticidadAlta('alta')).toBe(true)
    expect(esCriticidadAlta('critica')).toBe(true)
  })

  it('acepta la variante con tilde', () => {
    // El campo viaja como texto libre y han aparecido las dos formas.
    expect(esCriticidadAlta('crítica')).toBe(true)
  })

  it('no se deja engañar por mayúsculas', () => {
    expect(esCriticidadAlta('CRÍTICA')).toBe(true)
    expect(esCriticidadAlta('Alta')).toBe(true)
  })

  it('los niveles leves no son graves', () => {
    expect(esCriticidadAlta('media')).toBe(false)
    expect(esCriticidadAlta('baja')).toBe(false)
  })
})

describe('etiquetaCriticidad', () => {
  it('critica ya no se muestra como Informativa', () => {
    // Este era el bug: 'critica' es el nivel MÁS grave del backend y caía al
    // último return, así que se pintaba como el más leve.
    expect(etiquetaCriticidad('critica')).toBe('Crítica')
    expect(etiquetaCriticidad('crítica')).toBe('Crítica')
  })

  it('mantiene las etiquetas que ya existían', () => {
    expect(etiquetaCriticidad('alta')).toBe('Crítica')
    expect(etiquetaCriticidad('media')).toBe('Atención')
    expect(etiquetaCriticidad('baja')).toBe('Informativa')
  })
})

describe('obtenerResumenAlertas', () => {
  it('cuenta como crítica una alerta marcada critica', () => {
    const resumen = obtenerResumenAlertas([alerta('critica'), alerta('media')])
    expect(resumen.criticas).toBe(1)
  })

  it('una crítica ya cerrada no sigue contando', () => {
    const resumen = obtenerResumenAlertas([alerta('critica', 'cerrada')])
    expect(resumen.criticas).toBe(0)
  })

  it('una crítica en atención sigue siendo crítica', () => {
    const resumen = obtenerResumenAlertas([alerta('alta', 'en_proceso')])
    expect(resumen.criticas).toBe(1)
  })

  it('separa por atender de en atención', () => {
    const resumen = obtenerResumenAlertas([
      alerta('media', 'abierta'),
      alerta('media', 'en_proceso'),
      alerta('media', 'cerrada'),
    ])
    expect(resumen).toMatchObject({ total: 3, abiertas: 1, enProceso: 1 })
  })
})

describe('filtrarAlertas', () => {
  const filtros = { estado: 'todas', criticidad: 'todas', galponId: 'todos' } as const

  it('filtrar por Crítica también trae las marcadas critica', () => {
    // El desplegable manda 'alta'; sin esto, las más graves quedaban fuera.
    const visibles = filtrarAlertas(
      [alerta('alta'), alerta('critica'), alerta('media')],
      { ...filtros, criticidad: 'alta' },
    )
    expect(visibles).toHaveLength(2)
  })

  it('filtrar por Atención no arrastra las graves', () => {
    const visibles = filtrarAlertas(
      [alerta('alta'), alerta('critica'), alerta('media')],
      { ...filtros, criticidad: 'media' },
    )
    expect(visibles).toHaveLength(1)
  })

  it('sin filtro se ven todas', () => {
    const visibles = filtrarAlertas([alerta('alta'), alerta('media')], filtros)
    expect(visibles).toHaveLength(2)
  })
})
