// Tipos del reconocimiento de voz del navegador. No vienen en las definiciones
// estándar de TypeScript: la API sigue siendo un borrador y Chrome la expone
// con prefijo, así que se declara aquí lo poco que se usa.

export type ReconocimientoEvento = Event & {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
  resultIndex: number
}

export type Reconocimiento = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  abort: () => void
  onresult: ((evento: ReconocimientoEvento) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

type ConstructorReconocimiento = new () => Reconocimiento

export function obtenerReconocimiento(): ConstructorReconocimiento | undefined {
  const ventana = window as typeof window & {
    SpeechRecognition?: ConstructorReconocimiento
    webkitSpeechRecognition?: ConstructorReconocimiento
  }
  return ventana.SpeechRecognition ?? ventana.webkitSpeechRecognition
}
