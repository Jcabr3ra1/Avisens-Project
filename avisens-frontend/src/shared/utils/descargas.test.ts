import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nombreConFecha } from './descargas'

describe('nombreConFecha', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('usa la fecha local, no la UTC', () => {
    // Las 19:00 en Colombia ya son del día siguiente en UTC. El archivo debe
    // llevar el día que el usuario tiene en pantalla, no el del meridiano.
    vi.setSystemTime(new Date('2026-09-10T19:30:00-05:00'))
    expect(nombreConFecha('prospectos', 'csv')).toBe('prospectos-2026-09-10.csv')
  })

  it('rellena mes y día con cero a la izquierda', () => {
    vi.setSystemTime(new Date('2026-03-05T10:00:00-05:00'))
    expect(nombreConFecha('prospectos', 'csv')).toBe('prospectos-2026-03-05.csv')
  })
})
