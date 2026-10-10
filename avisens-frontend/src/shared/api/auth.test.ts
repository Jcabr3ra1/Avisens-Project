import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { login, logout } from './auth'
import { api, generacionActual } from './client'
import * as tokens from './tokens'
import type { LoginSesionResponse } from './types'

vi.mock('./client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./client')>()
  return { ...actual, api: { post: vi.fn() } }
})

const post = vi.mocked(api.post)

function deferida<T>() {
  let resolver!: (valor: T) => void
  let rechazar!: (error: unknown) => void
  const promesa = new Promise<T>((res, rej) => {
    resolver = res
    rechazar = rej
  })
  return { promesa, resolver, rechazar }
}

function respuestaLogin(accessToken: string, refreshToken: string): { data: LoginSesionResponse } {
  return {
    data: {
      requiere_cambio_password: false,
      access_token: accessToken,
      refresh_token: refreshToken,
      usuario: { id: 1, nombre: 'Test', email: 'test@avisens.com', rol: 'Operario' },
    },
  }
}

describe('auth.ts — logout()', () => {
  beforeEach(() => {
    vi.spyOn(tokens, 'getRefreshToken').mockReturnValue('refresh-actual')
    vi.spyOn(tokens, 'setTokens').mockImplementation(() => {})
    vi.spyOn(tokens, 'setUsuario').mockImplementation(() => {})
    vi.spyOn(tokens, 'clearTokens').mockImplementation(() => {})
    post.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('limpia el storage local y sube la generación de forma SÍNCRONA, antes de esperar la red', () => {
    const { promesa } = deferida<unknown>()
    post.mockReturnValue(promesa as never) // la red nunca resuelve en esta prueba

    const generacionAntes = generacionActual()
    void logout() // deliberadamente sin await: solo interesa el efecto síncrono

    // Para cuando esta línea corre, el cuerpo de logout() ya se ejecutó
    // hasta su primer (y único) punto de espera real -- y como la llamada
    // de red es "void ... .catch(...)" (nunca se espera), el storage y la
    // generación ya deberían estar actualizados, sin que la promesa de
    // red haya resuelto todavía.
    expect(tokens.clearTokens).toHaveBeenCalledTimes(1)
    expect(generacionActual()).toBe(generacionAntes + 1)
  })

  it('refresh pendiente → logout → nuevo login, éxito tardío del logout: no debe tocar los tokens del login nuevo', async () => {
    const logoutDiferido = deferida<{ data: unknown }>()
    post
      .mockReturnValueOnce(logoutDiferido.promesa as never) // la llamada de /auth/logout
      .mockResolvedValueOnce(respuestaLogin('access-nuevo', 'refresh-nuevo') as never) // el login que sigue

    await logout() // dispara /auth/logout, sin esperar su propia respuesta
    await login({ email: 'otro@avisens.com', password: 'xxxxxx' })

    expect(tokens.setTokens).toHaveBeenCalledWith('access-nuevo', 'refresh-nuevo')
    const llamadasATokens = vi.mocked(tokens.setTokens).mock.calls.length

    // Ahora sí "llega" la respuesta tardía del logout -- no debe disparar
    // ningún otro efecto sobre el storage.
    logoutDiferido.resolver({ data: {} })
    await Promise.resolve() // deja correr el microtask del .catch() de logout()

    expect(tokens.setTokens).toHaveBeenCalledTimes(llamadasATokens)
    expect(tokens.setTokens).toHaveBeenLastCalledWith('access-nuevo', 'refresh-nuevo')
  })

  it('envía el refresh token en el body, nunca en Authorization', async () => {
    post.mockResolvedValue({ data: {} } as never)

    await logout()

    expect(post).toHaveBeenCalledWith('/auth/logout', { refresh_token: 'refresh-actual' })
  })

  it('si no hay refresh token guardado, no llama a la red pero igual limpia la sesión local', async () => {
    vi.spyOn(tokens, 'getRefreshToken').mockReturnValue(null)

    await logout()

    expect(post).not.toHaveBeenCalled()
    expect(tokens.clearTokens).toHaveBeenCalledTimes(1)
  })
})

describe('auth.ts — login()', () => {
  beforeEach(() => {
    vi.spyOn(tokens, 'setTokens').mockImplementation(() => {})
    vi.spyOn(tokens, 'setUsuario').mockImplementation(() => {})
    vi.spyOn(tokens, 'clearTokens').mockImplementation(() => {})
    post.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('un login exitoso sube la generación', async () => {
    post.mockResolvedValue(respuestaLogin('a', 'r') as never)
    const generacionAntes = generacionActual()

    await login({ email: 'x@x.com', password: '123456' })

    expect(generacionActual()).toBe(generacionAntes + 1)
  })
})
