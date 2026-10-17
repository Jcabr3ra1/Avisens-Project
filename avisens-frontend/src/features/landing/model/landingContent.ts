import avicultor from '../assets/hero/avicultor.webp'
import comunidad from '../assets/hero/comunidad.webp'
import aves from '../assets/hero/pollos-engorde.webp'

export type StoryMediaSource =
  | { kind: 'image'; src: string; description: string; position?: string }
  | {
      kind: 'video'
      src: string
      poster: string
      description: string
      position?: string
      captions?: { src: string; language: string; label: string }
    }

// Cada escena acepta una fotografía o un video real con poster. El componente
// de medios solo muestra controles de reproducción cuando existe un video.
export const storyMedia: Record<'opening' | 'people' | 'farm', StoryMediaSource> = {
  opening: {
    kind: 'image', src: avicultor,
    description: 'Un avicultor sostiene una gallina dentro de un galpón.',
    position: '50% 45%',
  },
  people: {
    kind: 'image', src: comunidad,
    description: 'Personas reunidas en un entorno rural.',
    position: '50% 50%',
  },
  farm: {
    kind: 'image', src: aves,
    description: 'Aves de engorde alrededor de un comedero en el galpón.',
    position: '50% 50%',
  },
}

export const storySteps = [
  {
    name: 'Registrar',
    title: 'Que el trabajo de hoy no se pierda.',
    text: 'El alimento, los pesajes y las novedades del lote quedan en un mismo lugar. Lo que pasa en el galpón empieza a contar una historia.',
    record: 'La jornada',
    detail: 'Alimento · pesajes · novedades',
  },
  {
    name: 'Entender',
    title: 'Ver el lote completo, no datos sueltos.',
    text: 'Seguir el crecimiento y revisar el consumo ayuda a comprender cómo va cada ciclo. Información organizada para hacer mejores preguntas.',
    record: 'El seguimiento',
    detail: 'Crecimiento · consumo · sanidad',
  },
  {
    name: 'Decidir',
    title: 'Planear el siguiente paso con más claridad.',
    text: 'Conocer lo que ocurrió permite revisar recursos y preparar lo que viene. Tú conoces tu granja; Avisens te ayuda a ver su información.',
    record: 'La siguiente decisión',
    detail: 'Recursos · planificación · contexto',
  },
] as const

export const landingChapters = [
  { id: 'quienes-somos', label: 'Quiénes somos' },
  { id: 'un-lote', label: 'Un lote, 42 días' },
  { id: 'como-acompanamos', label: 'Cómo acompañamos' },
  { id: 'avia', label: 'AVIA' },
] as const
