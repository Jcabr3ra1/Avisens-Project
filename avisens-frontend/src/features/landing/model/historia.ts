import avicultor from '../assets/hero/avicultor.webp'
import comunidad from '../assets/hero/comunidad.webp'
import aves from '../assets/hero/pollos-engorde.webp'

export const fotos = { avicultor, comunidad, aves }

const base = import.meta.env.BASE_URL

const video = (nombre: string) => ({
  hevc: `${base}videos/${nombre}-hevc.mp4`,
  h264: `${base}videos/${nombre}.mp4`,
  poster: `${base}videos/${nombre}-poster.webp`,
})

export const videos = {
  inicio: video('inicio'),
  manana: video('problema-manana'),
  calor: video('problema-calor'),
  lluvia: video('problema-lluvia'),
  solucion: video('solucion'),
}

export const inicio = {
  titulo: ['Detrás de cada granja,', 'hay una historia.'],
  bajada: 'Tu galpón, organizado en el celular. Para que tus pollos crezcan sanos y rindan más.',
  frase: 'Los pollos no se pierden en un día. Se pierden en los detalles que nadie anotó.',
}

export const problema = {
  titulo: 'Así se pierden los pollos',
  datos: [
    { titulo: 'Pesaje: 420 g', estado: 'Solo en papel', tono: 'neutro', texto: 'Cada mañana alguien pesa las aves y lo escribe en un cuaderno. El dato existe, pero se queda en el galpón: nadie lo compara con lo esperado para su edad.' },
    { titulo: 'Galpón a 34 °C', estado: 'Sin aviso', tono: 'alerta', texto: 'A media tarde el calor sube seis grados por encima del rango. Los pollos jadean, comen menos y dejan de ganar peso. Nadie se entera a tiempo.' },
    { titulo: '0 de 3 registros', estado: 'Se perdieron', tono: 'perdido', texto: 'Un aguacero, un café derramado o una hoja arrancada, y el historial desaparece. Sin datos no hay cómo saber qué falló en este lote.' },
  ],
  momentos: [
    { cuando: '6:00 a. m.', texto: 'Se anota a mano.' },
    { cuando: '2:30 p. m.', texto: 'Calor. Nadie lo ve.' },
    { cuando: 'Al otro día', texto: 'El cuaderno se moja.' },
  ],
  remate: 'El trabajo se hizo. La información se perdió.',
}

export const producto = {
  titulo: 'El mismo día, con Avisens',
  momentos: [
    { cuando: '6:00 a. m.', texto: 'Anotas en segundos.' },
    { cuando: '2:30 p. m.', texto: 'Calor. Te avisa al instante.' },
    { cuando: '2:45 p. m.', texto: 'Abres cortinas. Vuelve a 28 °C.' },
    { cuando: 'Al otro día', texto: 'Todo sigue ahí. Y ves cómo crecen.' },
  ],
  datos: [
    { titulo: 'Pesaje en 8 segundos', estado: 'Guardado', tono: 'ok', texto: 'El operario anota el peso desde su celular. Queda guardado al instante y lo ves desde donde estés, comparado con lo esperado para su edad.' },
    { titulo: 'Aviso a los 34 °C', estado: 'Te avisa', tono: 'alerta', texto: 'Los sensores miden el galpón todo el día. Cuando la temperatura se sale del rango, te llega una alerta al celular con lo que puedes hacer.' },
    { titulo: 'De vuelta a 28 °C', estado: 'En rango', tono: 'ok', texto: 'Abres las cortinas y ves en vivo cómo baja la temperatura. Quince minutos después, el galpón está de nuevo donde debe estar.' },
    { titulo: '+3 % sobre la curva', estado: 'Historial completo', tono: 'ok', texto: 'Cada pesaje, cada alerta y cada kilo de alimento quedan guardados. Ves cómo crece el lote y llegas a la venta con números claros.' },
  ],
  remate: ['Mismo día. Mismos pollos.', 'Otra historia.'],
}

export const beneficios = {
  etiqueta: 'Lo que ganas',
  titulo: ['Tu galpón te avisa.', 'Tú decides a tiempo.'],
  lista: [
    { titulo: 'Alertas antes del problema', texto: 'Te enteras del calor en el momento, no al otro día.' },
    { titulo: 'Todo tu equipo, en un solo lugar', texto: 'Cada operario anota desde su celular.' },
    { titulo: 'Sabes si tus pollos van bien', texto: 'Su peso, contra lo esperado para su edad.' },
    { titulo: 'Cada kilo de alimento rinde', texto: 'Ves cuánto alimento cuesta cada kilo de pollo.' },
  ],
}

export const mision = {
  etiqueta: 'Lo que buscamos',
  frase: ['Que ningún avicultor', 'pierda sus pollos por', 'no tener la información', 'a tiempo.'],
  firma: 'Tecnología simple, hecha en Colombia para el campo.',
}
