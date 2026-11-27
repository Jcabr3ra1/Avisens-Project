import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@shared/api'
import { eliminarProspecto } from './prospectos'

vi.mock('@shared/api', () => ({ api: { delete: vi.fn() } }))

describe('eliminarProspecto', () => {
  beforeEach(() => { vi.mocked(api.delete).mockReset() })

  it('envía la confirmación en el cuerpo del DELETE del prospecto seleccionado', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { id: 7, eliminado: true } })
    await eliminarProspecto(7, 'ELIMINAR')
    expect(api.delete).toHaveBeenCalledWith('/prospectos/7', { data: { confirmacion: 'ELIMINAR' } })
  })

  it('propaga el error del servidor para conservar el diálogo y permitir reintentar', async () => {
    const error = new Error('No se pudo eliminar')
    vi.mocked(api.delete).mockRejectedValue(error)
    await expect(eliminarProspecto(7, 'ELIMINAR')).rejects.toBe(error)
  })
});
