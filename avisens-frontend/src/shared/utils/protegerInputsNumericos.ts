/**
 * Protege todos los `<input type="number">` de la aplicación contra entradas
 * inesperadas del navegador:
 * - Bloquea notación científica (`e`, `E`) y signo `+` al teclear o pegar.
 * - Bloquea el signo `-` cuando el campo tiene `min >= 0`.
 * - Bloquea separadores decimales (`.` y `,`) cuando el campo es estrictamente
 *   entero (`step` entero >= 1 o `inputMode="numeric"`).
 * - Evita que la rueda del ratón cambie accidentalmente un número enfocado al
 *   desplazar la página.
 */

export interface AtributosInputNumerico {
  type: string
  min: string
  step: string
  inputMode: string
}

export function permiteNegativos(input: Pick<AtributosInputNumerico, 'min'>): boolean {
  if (input.min === '') return true
  const minimo = Number(input.min)
  return Number.isNaN(minimo) || minimo < 0
}

export function soloEnteros(input: Pick<AtributosInputNumerico, 'step' | 'inputMode'>): boolean {
  if (input.inputMode === 'numeric') return true
  const paso = input.step.trim()
  if (paso === '' || paso === 'any') return false
  const valor = Number(paso)
  return Number.isFinite(valor) && valor >= 1 && Number.isInteger(valor)
}

export function esTeclaNumericaBloqueada(
  tecla: string,
  opciones: { negativos: boolean; enteros: boolean },
): boolean {
  if (tecla === 'e' || tecla === 'E' || tecla === '+') return true
  if (!opciones.negativos && tecla === '-') return true
  if (opciones.enteros && (tecla === '.' || tecla === ',')) return true
  return false
}

export function esPegadoNumericoValido(
  texto: string,
  opciones: { negativos: boolean; enteros: boolean },
): boolean {
  const limpio = texto.trim()
  if (limpio === '') return true
  if (opciones.enteros) {
    return (opciones.negativos ? /^-?\d+$/ : /^\d+$/).test(limpio)
  }
  return (opciones.negativos ? /^-?\d+(?:[.,]\d+)?$/ : /^\d+(?:[.,]\d+)?$/).test(limpio)
}

export function debeBloquearTeclaEnInput(
  input: AtributosInputNumerico,
  tecla: string,
): boolean {
  if (input.type !== 'number') return false
  return esTeclaNumericaBloqueada(tecla, {
    negativos: permiteNegativos(input),
    enteros: soloEnteros(input),
  })
}

export function debeBloquearPegadoEnInput(
  input: AtributosInputNumerico,
  texto: string,
): boolean {
  if (input.type !== 'number') return false
  return !esPegadoNumericoValido(texto, {
    negativos: permiteNegativos(input),
    enteros: soloEnteros(input),
  })
}

function esInputNumerico(objetivo: EventTarget | null): objetivo is HTMLInputElement {
  return (
    typeof HTMLInputElement !== 'undefined' &&
    objetivo instanceof HTMLInputElement &&
    objetivo.type === 'number'
  )
}

export function instalarProteccionInputsNumericos(raiz: Document = document): () => void {
  function alPresionarTecla(evento: KeyboardEvent) {
    if (evento.ctrlKey || evento.metaKey || evento.altKey) return
    if (!esInputNumerico(evento.target)) return
    if (debeBloquearTeclaEnInput(evento.target, evento.key)) {
      evento.preventDefault()
    }
  }

  function alPegar(evento: ClipboardEvent) {
    if (!esInputNumerico(evento.target)) return
    const texto = evento.clipboardData?.getData('text') ?? ''
    if (debeBloquearPegadoEnInput(evento.target, texto)) {
      evento.preventDefault()
    }
  }

  function alUsarRueda(evento: WheelEvent) {
    if (!esInputNumerico(evento.target)) return
    if (raiz.activeElement === evento.target) {
      evento.target.blur()
    }
  }

  raiz.addEventListener('keydown', alPresionarTecla)
  raiz.addEventListener('paste', alPegar)
  raiz.addEventListener('wheel', alUsarRueda, { passive: true })

  return () => {
    raiz.removeEventListener('keydown', alPresionarTecla)
    raiz.removeEventListener('paste', alPegar)
    raiz.removeEventListener('wheel', alUsarRueda)
  }
}
