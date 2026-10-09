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

function error401(config: Record<string, unknown>) {
  return {
    response: { status: 401 },
    config,
    isAxiosError: true,
  } as never
}

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

// --- Recorrido REAL de Axios ------------------------------------------------
//
// Las pruebas de arriba invocan el manejador de respuesta directamente --
// útil para la lógica de generación en sí, pero no prueba lo que de verdad
// causó el bug: un reintento (`return api(original)`) vuelve a pasar por el
// interceptor de PETICIÓN, que Axios ejecuta de forma asíncrona. Estas
// pruebas disparan peticiones reales contra `api` (`api.get(...)`), con un
// adapter simulado en vez de red real, para que los dos interceptores
// (petición y respuesta) corran tal cual corren en producción.
describe('client.ts — recorrido real de Axios (adapter simulado, sin red)', () => {
  const adapterOriginal = api.defaults.adapter

  beforeEach(() => {
    vi.spyOn(tokens, 'getRefreshToken').mockReturnValue('refresh-valido')
    vi.spyOn(tokens, 'getAccessToken').mockReturnValue('access-de-sesion-A')
    vi.spyOn(tokens, 'setTokens').mockImplementation(() => {})
    vi.spyOn(tokens, 'clearTokens').mockImplementation(() => {})
    nuevaGeneracion()
  })

  afterEach(() => {
    api.defaults.adapter = adapterOriginal
    vi.restoreAllMocks()
  })

  // Adapter de prueba: la primera llamada a cualquier URL "falla" con 401
  // (como si el access token hubiera expirado); las siguientes "resuelven"
  // 200 -- y registran con qué cabecera Authorization llegó cada una, para
  // poder comprobar bajo qué identidad se mandó de verdad cada intento.
  function instalarAdapterSimulado() {
    const llamadas: Array<{ authorization: unknown; retry: unknown }> = []
    api.defaults.adapter = async (config) => {
      llamadas.push({
        authorization: config.headers?.Authorization,
        retry: (config as { _retry?: boolean })._retry,
      })
      if (llamadas.length === 1) {
        const error = new Error('401') as Error & {
          response: unknown
          config: unknown
          isAxiosError: boolean
        }
        error.response = { status: 401, data: {}, headers: {}, config }
        error.config = config
        error.isAxiosError = true
        throw error
      }
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config }
    }
    return llamadas
  }

  it('camino normal (generación sin cambios): el reintento real sí se envía, con el token nuevo', async () => {
    const llamadas = instalarAdapterSimulado()
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { access_token: 'access-nuevo', refresh_token: 'refresh-nuevo' },
    } as never)

    const respuesta = await api.get('/granjas')

    expect(respuesta.data).toEqual({ ok: true })
    expect(llamadas).toHaveLength(2)
    expect(llamadas[0].retry).toBeUndefined()
    expect(llamadas[1].retry).toBe(true)
    expect(llamadas[1].authorization).toBe('Bearer access-nuevo')
  })

  it('REGRESIÓN (bloqueante #1): si la sesión cambia mientras se espera el refresh, la petición original NUNCA se reenvía -- ni con el token viejo ni con el nuevo', async () => {
    const llamadas = instalarAdapterSimulado()
    const { promesa, resolver } = deferida<{ data: { access_token: string; refresh_token: string } }>()
    // Señal de que axios.post YA se llamó de verdad -- Axios ejecuta sus
    // interceptores de forma asíncrona (microtasks), así que no alcanza
    // con disparar api.get(...) y seguir con código síncrono: hay que
    // esperar a que el pipeline real (interceptor de petición -> adapter
    // -> 401 -> interceptor de respuesta -> obtenerPromesaDeRenovacion)
    // de verdad haya llegado hasta acá, con la generación TODAVÍA en N,
    // antes de cambiarla.
    const { promesa: llamadaAPostHecha, resolver: avisarLlamadaAPost } = deferida<void>()
    vi.spyOn(axios, 'post').mockImplementation(() => {
      avisarLlamadaAPost()
      return promesa as never
    })

    const intento = api.get('/granjas')
    await llamadaAPostHecha

    // Recién ahora, con el refresh de verdad en vuelo, cambia la sesión
    // (p. ej. un logout y/o un login nuevo en otra parte de la app).
    nuevaGeneracion()
    resolver({ data: { access_token: 'access-de-sesion-B', refresh_token: 'refresh-de-sesion-B' } })

    await expect(intento).rejects.toBeDefined()
    // El adapter solo debió recibir la llamada original (401) -- el
    // reintento nunca debió dispararse, bajo ninguna identidad.
    expect(llamadas).toHaveLength(1)
  })

  it('REGRESIÓN (bloqueante #1, ventana exacta): refresh exitoso → se programa api(original) → la sesión cambia ANTES de que corra el interceptor de petición del reintento → el adapter NUNCA recibe la segunda llamada', async () => {
    const llamadas = instalarAdapterSimulado()
    const { promesa, resolver } = deferida<{ data: { access_token: string; refresh_token: string } }>()
    const { promesa: llamadaAPostHecha, resolver: avisarLlamadaAPost } = deferida<void>()
    vi.spyOn(axios, 'post').mockImplementation(() => {
      avisarLlamadaAPost()
      return promesa as never
    })

    const intento = api.get('/granjas')
    await llamadaAPostHecha
    // En este punto el interceptor de respuesta YA está en
    // `await obtenerPromesaDeRenovacion()` -- es decir, YA registró su
    // propia continuación sobre esa promesa (es lo que hizo `await` recién
    // para llegar hasta el axios.post real de arriba).

    // Engancho MI propio cambio de generación a la MISMA promesa que el
    // interceptor está esperando, pero registrándolo DESPUÉS que él. Las
    // reacciones de una promesa corren en el orden en que se registraron:
    // cuando la promesa resuelva, primero correrá la continuación del
    // interceptor (Check #2 pasa, llama a api(original) -- lo que ENCOLA
    // la pasada del interceptor de petición para el reintento, al FINAL de
    // la cola, después de lo que ya estaba encolado), y solo DESPUÉS mi
    // reacción (que ya estaba encolada ANTES que esa pasada recién
    // encolada). Resultado determinista: mi cambio de generación corre
    // DESPUÉS de que Check #2 ya pasó y se llamó a api(original), pero
    // ANTES de que el interceptor de petición del reintento se ejecute de
    // verdad -- exactamente la ventana que describe el hallazgo, sin
    // depender de contar microtasks a mano.
    obtenerPromesaDeRenovacion().then(() => {
      nuevaGeneracion()
    })

    resolver({ data: { access_token: 'access-de-sesion-B', refresh_token: 'refresh-de-sesion-B' } })

    await expect(intento).rejects.toBeDefined()
    // El adapter NUNCA debió recibir la segunda llamada (el reintento):
    // si esto falla con llamadas.length === 2, el reintento obsoleto
    // llegó a salir con credenciales que ya no eran las de la sesión que
    // lo originó -- exactamente el escenario que Codex reprodujo
    // (adapterCalls=2, obsoleteRetrySent=true).
    expect(llamadas).toHaveLength(1)
  })

  it('REGRESIÓN (bloqueante #1, invariante directo): un reintento con generación vigente pasa intacto; uno con generación OBSOLETA se rechaza, nunca sale intacto', async () => {
    const peticion = api.interceptors.request.handlers?.[0]?.fulfilled as unknown as (
      config: Record<string, unknown>,
    ) => Record<string, unknown> | Promise<never>

    // Primera pasada: petición fresca (sin _retry) -- se estampa con lo
    // que sea "actual" en este instante.
    const generacionOriginal = generacionActual()
    const configOriginal = (await peticion({ headers: {} })) as Record<string, unknown>
    expect(configOriginal._generacion).toBe(generacionOriginal)
    expect(configOriginal.headers).toMatchObject({ Authorization: 'Bearer access-de-sesion-A' })

    // Reintento (_retry=true) con la MISMA generación, todavía vigente:
    // pasa intacto -- no se le toca _generacion ni Authorization (ya los
    // fijó el interceptor de respuesta), y se deja salir.
    const configReintentadoVigente = await peticion({ ...configOriginal, _retry: true })
    expect(configReintentadoVigente).toMatchObject({
      _generacion: generacionOriginal,
      headers: { Authorization: 'Bearer access-de-sesion-A' },
    })

    // La sesión cambia, y con ella el access token guardado.
    nuevaGeneracion()
    vi.spyOn(tokens, 'getAccessToken').mockReturnValue('access-de-sesion-B')

    // Reintento (_retry=true) con la generación YA OBSOLETA: antes esto
    // simplemente "no tocaba nada" y lo dejaba salir igual -- ahí seguía
    // el bloqueante: un reintento obsoleto llegaba intacto al adapter con
    // credenciales que ya no eran las de la sesión actual. Ahora debe
    // RECHAZARSE aquí mismo, antes de salir hacia el adapter/red.
    const intentoObsoleto = peticion({ ...configOriginal, _retry: true })
    await expect(intentoObsoleto).rejects.toBeInstanceOf(RenovacionDescartadaError)
  })

  it('REGRESIÓN (bloqueante #2): si la sesión cambia justo antes de que corra el catch de un refresh fallido, no limpia ni redirige la sesión nueva', async () => {
    const { promesa, rechazar } = deferida<string>()
    vi.spyOn(axios, 'post').mockReturnValue(promesa as never)

    const generacionDeLaPeticion = generacionActual()

    // Arranca el refresco YO MISMO primero, para obtener la MISMA promesa
    // deduplicada que el interceptor de respuesta real (manejadorDeRecha
    // zoDeRespuesta, la función registrada de verdad en `api`) va a
    // esperar -- y le engancho el cambio de generación como reacción
    // ANTES de que el interceptor llegue a registrar la suya. Las
    // reacciones de una misma promesa corren en el orden en que se
    // registraron: así se garantiza, sin adivinar tiempos, que
    // renovarAccessToken() ya decidió "esto es un fallo real de la
    // generación N" (generación todavía sin cambiar en ESE instante) y
    // que el cambio de sesión ocurre DESPUÉS de esa decisión pero ANTES
    // de que el catch del interceptor la reciba -- el intercalado exacto
    // que describe el hallazgo.
    const promesaDeRefresco = obtenerPromesaDeRenovacion()
    promesaDeRefresco.catch(() => {
      nuevaGeneracion() // el "login nuevo" ya terminó, justo aquí
    })

    const rejected = manejadorDeRechazoDeRespuesta()
    const intento = rejected(
      error401({ url: '/granjas', headers: {}, _generacion: generacionDeLaPeticion }),
    )

    rechazar(new Error('401 real del backend')) // fallo genuino, bajo la generación N

    await expect(intento).rejects.toBeDefined()
    expect(tokens.clearTokens).not.toHaveBeenCalled()
  })
})
