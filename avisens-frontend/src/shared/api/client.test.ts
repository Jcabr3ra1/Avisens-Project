import axios from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  api,
  generacionActual,
  nuevaGeneracion,
  obtenerPromesaDeRenovacion,
  RenovacionDescartadaError,
} from './client'
import * as tokens from './tokens'

// --- Promesa "deferred": permite controlar a mano CUÁNDO resuelve o
// rechaza la respuesta simulada del backend, para fijar el orden exacto de
// los eventos en cada prueba sin depender de temporizadores reales.
// El manejador "rejected" del interceptor de respuesta, invocado
// directamente -- evita montar un ciclo HTTP real solo para probar la
// lógica de generación. `handlers` existe siempre que se registró al
// menos un interceptor (como hace client.ts al cargarse); el tipo de
// axios lo marca opcional porque en general podría no haber ninguno.
function manejadorDeRechazoDeRespuesta(): (error: unknown) => Promise<unknown> {
  const manejadores = api.interceptors.response as unknown as {
    handlers: Array<{ rejected: (error: unknown) => Promise<unknown> }>
  }
  return manejadores.handlers[0].rejected
}

function deferida<T>() {
  let resolver!: (valor: T) => void
  let rechazar!: (error: unknown) => void
  const promesa = new Promise<T>((res, rej) => {
    resolver = res
    rechazar = rej
  })
  return { promesa, resolver, rechazar }
}

describe('client.ts — generación de sesión', () => {
  beforeEach(() => {
    vi.spyOn(tokens, 'getRefreshToken').mockReturnValue('refresh-valido')
    vi.spyOn(tokens, 'getAccessToken').mockReturnValue('access-valido')
    vi.spyOn(tokens, 'setTokens').mockImplementation(() => {})
    vi.spyOn(tokens, 'clearTokens').mockImplementation(() => {})
    // La generación es un contador en memoria compartido por todas las
    // pruebas del módulo: se sube al principio de cada una para arrancar
    // desde un número conocido y aislado.
    nuevaGeneracion()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('nuevaGeneracion() sube el contador cada vez que se llama', () => {
    const antes = generacionActual()
    nuevaGeneracion()
    expect(generacionActual()).toBe(antes + 1)
  })

  it('obtenerPromesaDeRenovacion() reutiliza la misma promesa para la MISMA generación (dedup)', () => {
    const postSpy = vi.spyOn(axios, 'post').mockReturnValue(
      new Promise(() => {}), // nunca resuelve en esta prueba
    )

    const p1 = obtenerPromesaDeRenovacion()
    const p2 = obtenerPromesaDeRenovacion()

    expect(p1).toBe(p2)
    expect(postSpy).toHaveBeenCalledTimes(1)
  })

  it('refresh pendiente → logout: una respuesta tardía y EXITOSA no debe escribir tokens', async () => {
    const { promesa, resolver } = deferida<{ data: { access_token: string; refresh_token: string } }>()
    vi.spyOn(axios, 'post').mockReturnValue(promesa as never)

    const renovacion = obtenerPromesaDeRenovacion()

    // "logout": sube la generación (igual que hace auth.logout() antes de
    // tocar la red).
    nuevaGeneracion()

    // Llega tarde la respuesta del refresh viejo, con tokens válidos.
    resolver({ data: { access_token: 'nuevo-access', refresh_token: 'nuevo-refresh' } })

    await expect(renovacion).rejects.toThrow(RenovacionDescartadaError)
    expect(tokens.setTokens).not.toHaveBeenCalled()
  })

  it('refresh pendiente → logout: una respuesta tardía y de ERROR tampoco debe propagarse como fallo real', async () => {
    const { promesa, rechazar } = deferida<never>()
    vi.spyOn(axios, 'post').mockReturnValue(promesa as never)

    const renovacion = obtenerPromesaDeRenovacion()
    nuevaGeneracion() // logout

    rechazar(new Error('401 del backend, llega tarde'))

    await expect(renovacion).rejects.toThrow(RenovacionDescartadaError)
  })

  it('refresh pendiente → logout → nuevo login, éxito tardío: no debe pisar los tokens del login nuevo', async () => {
    const { promesa, resolver } = deferida<{ data: { access_token: string; refresh_token: string } }>()
    vi.spyOn(axios, 'post').mockReturnValue(promesa as never)

    const renovacionVieja = obtenerPromesaDeRenovacion()

    nuevaGeneracion() // logout
    nuevaGeneracion() // login nuevo (simulado aquí solo con el cambio de generación)

    resolver({ data: { access_token: 'token-de-sesion-vieja', refresh_token: 'refresh-de-sesion-vieja' } })

    await expect(renovacionVieja).rejects.toThrow(RenovacionDescartadaError)
    // setTokens nunca se llamó con los datos de la renovación vieja.
    expect(tokens.setTokens).not.toHaveBeenCalledWith(
      'token-de-sesion-vieja',
      'refresh-de-sesion-vieja',
    )
  })

  it('un refresh viejo que termina tarde NO borra la referencia de uno nuevo ya en curso', async () => {
    const primera = deferida<{ data: { access_token: string; refresh_token: string } }>()
    const segunda = deferida<{ data: { access_token: string; refresh_token: string } }>()
    const postSpy = vi
      .spyOn(axios, 'post')
      .mockReturnValueOnce(primera.promesa as never)
      .mockReturnValueOnce(segunda.promesa as never)

    const refrescoViejo = obtenerPromesaDeRenovacion() // generación N

    nuevaGeneracion() // la sesión cambia: generación N+1
    const refrescoNuevo = obtenerPromesaDeRenovacion() // dispara OTRA llamada, para N+1

    expect(postSpy).toHaveBeenCalledTimes(2)
    expect(refrescoViejo).not.toBe(refrescoNuevo)

    // Se resuelve (tarde) el refresh viejo, de la generación ya superada.
    primera.resolver({ data: { access_token: 'viejo', refresh_token: 'viejo' } })
    await refrescoViejo.catch(() => {}) // se descarta, no interesa su resultado

    // obtenerPromesaDeRenovacion() otra vez, bajo la generación N+1: si el
    // refresh viejo hubiera borrado la referencia al nuevo, esto dispararía
    // una TERCERA llamada a axios.post en vez de reutilizar la segunda.
    const referenciaTrasTerminarElViejo = obtenerPromesaDeRenovacion()
    expect(referenciaTrasTerminarElViejo).toBe(refrescoNuevo)
    expect(postSpy).toHaveBeenCalledTimes(2)

    segunda.resolver({ data: { access_token: 'nuevo', refresh_token: 'nuevo' } })
    await refrescoNuevo
  })
})

describe('client.ts — interceptor de respuesta', () => {
  beforeEach(() => {
    vi.spyOn(tokens, 'getRefreshToken').mockReturnValue('refresh-valido')
    vi.spyOn(tokens, 'getAccessToken').mockReturnValue('access-valido')
    vi.spyOn(tokens, 'setTokens').mockImplementation(() => {})
    vi.spyOn(tokens, 'clearTokens').mockImplementation(() => {})
    nuevaGeneracion()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function error401(config: Record<string, unknown>) {
    return {
      response: { status: 401 },
      config,
      isAxiosError: true,
    } as never
  }

  it('excluye /auth/login, /auth/refresh y /auth/logout del reintento automático', async () => {
    const postSpy = vi.spyOn(axios, 'post')
    const rejected = manejadorDeRechazoDeRespuesta()

    for (const url of ['/auth/login', '/auth/refresh', '/auth/logout']) {
      await expect(
        rejected(error401({ url, headers: {}, _generacion: generacionActual() })),
      ).rejects.toBeDefined()
    }
    // Ninguna de las tres debió disparar un intento de refresh.
    expect(postSpy).not.toHaveBeenCalled()
  })

  it('una petición cuya generación ya no es la actual se rechaza sin intentar refrescar', async () => {
    const postSpy = vi.spyOn(axios, 'post')
    const rejected = manejadorDeRechazoDeRespuesta()

    const generacionDeLaPeticion = generacionActual()
    nuevaGeneracion() // la sesión ya cambió antes de que llegue el 401

    await expect(
      rejected(
        error401({
          url: '/granjas',
          headers: {},
          _generacion: generacionDeLaPeticion,
        }),
      ),
    ).rejects.toBeDefined()

    expect(postSpy).not.toHaveBeenCalled()
  })

  it('si la sesión cambia MIENTRAS se espera el refresh, no reintenta la petición original', async () => {
    const { promesa, resolver } = deferida<{ data: { access_token: string; refresh_token: string } }>()
    vi.spyOn(axios, 'post').mockReturnValue(promesa as never)
    const rejected = manejadorDeRechazoDeRespuesta()

    const generacionDeLaPeticion = generacionActual()
    const intento = rejected(
      error401({ url: '/granjas', headers: {}, _generacion: generacionDeLaPeticion }),
    )

    // La sesión cambia MIENTRAS el refresh sigue en vuelo.
    nuevaGeneracion()
    resolver({ data: { access_token: 'nuevo', refresh_token: 'nuevo' } })

    // No debe reintentar la petición original bajo la sesión nueva.
    await expect(intento).rejects.toBeDefined()
  })
})
