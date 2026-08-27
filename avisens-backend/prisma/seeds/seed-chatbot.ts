import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

import {
  A11_ENERGIA,
  A13_INTERNET,
  A14_DOLOR,
  A16_MORTALIDAD,
  A18_PAGO,
  A19_URGENCIA,
  A20_DECIDE,
  A9_GALPON,
  OPCIONES_CALIFICADAS,
  textosDe,
} from '../../src/modules/chatbot/dominio/calificacion';

// La matriz sale del dominio, no se escribe a mano. Antes el texto de cada
// opcion vivia aqui y en el cuestionario por separado, y si no coincidian al
// caracter la pregunta no puntuaba: nada fallaba, solo calificaba mal.
const MATRIZ_CALIFICACION = Object.entries(OPCIONES_CALIFICADAS).flatMap(
  ([codigo, opciones]) =>
    opciones.map((o) => ({
      bloque: 'A',
      codigo_pregunta: codigo,
      opcion_respuesta: o.texto,
      puntaje: o.puntaje,
      descripcion: `Calificacion comercial (${codigo})`,
    })),
);

const PREGUNTAS_CHATBOT = [
  // =========================================================================
  // MENU PRINCIPAL
  // =========================================================================
  {
    codigo: 'M1',
    bloque: 'M',
    orden: 0,
    texto:
      '👋 Hola, soy *AVIA* de AVISENS 🐔\n\n' +
      'Ponemos sensores en tu galpón para que sepas qué está pasando ' +
      'antes de perder aves.\n\n' +
      '¿Qué necesitas?',
    tipo: 'opcion_unica',
    opciones: ['Quiero cotizar', 'Tengo dudas primero', 'Ya soy cliente'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A1',
    saltos: {
      'Quiero cotizar': 'A1',
      'Tengo dudas primero': 'BMP',
      'Ya soy cliente': 'S1',
    },
  },

  // =========================================================================
  // BLOQUE A — COTIZACION (calificacion del prospecto)
  // =========================================================================

  // --- Identificacion ---
  {
    codigo: 'A1',
    bloque: 'A',
    orden: 1,
    texto:
      '🔐 Antes de empezar: ¿autorizas el tratamiento de tus datos personales ' +
      'según la Ley de Hábeas Data (Ley 1581)?\n\n' +
      'Puedes consultar nuestra política aquí 👇\n' +
      'https://avisens-project-production.up.railway.app/privacidad',
    tipo: 'si_no',
    opciones: ['Sí autorizo', 'No autorizo'],
    campo_prospecto: 'consentimiento_habeas_data',
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A2',
    saltos: { 'No autorizo': 'FIN' },
  },
  {
    codigo: 'A2',
    bloque: 'A',
    orden: 2,
    texto: '👤 ¿Cómo te llamas?',
    tipo: 'texto_libre',
    opciones: null,
    campo_prospecto: 'nombre',
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A5',
    saltos: null,
  },

  // --- La granja ---
  {
    codigo: 'A5',
    bloque: 'A',
    orden: 6,
    texto: '🏘️ ¿Cuántos galpones tiene tu granja?',
    tipo: 'opcion_unica',
    opciones: [
      '1 galpón',
      '2 galpones',
      '3 galpones',
      '4 a 6 galpones',
      'Más de 6 galpones',
    ],
    campo_prospecto: 'numero_galpones',
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A6',
    saltos: null,
  },
  {
    codigo: 'A6',
    bloque: 'A',
    orden: 7,
    texto: '📏 ¿De qué tamaño es cada galpón?',
    tipo: 'opcion_unica',
    opciones: [
      'Menos de 200 m²',
      'Entre 200 y 500 m²',
      'Entre 500 y 1.000 m²',
      'Más de 1.000 m²',
      'Prefiero escribirlo',
    ],
    campo_prospecto: 'area_galpon_m2',
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A8',
    saltos: { 'Otro, lo escribo': 'A6B' },
  },
  {
    codigo: 'A6B',
    bloque: 'A',
    orden: 10,
    texto: '🏠 Escribe el tamaño del galpón en metros cuadrados',
    tipo: 'numero',
    opciones: null,
    campo_prospecto: 'area_galpon_m2',
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A8',
    saltos: null,
  },
  {
    codigo: 'A8',
    bloque: 'A',
    orden: 9,
    texto: '🐔 ¿Cuántas aves manejas en total?',
    tipo: 'opcion_unica',
    opciones: [
      'Menos de 1.000',
      'Entre 1.000 y 5.000',
      'Entre 5.000 y 10.000',
      'Más de 10.000',
    ],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A9',
    saltos: null,
  },
  {
    codigo: 'A9',
    bloque: 'A',
    orden: 10,
    texto: '🏗️ ¿Cómo están tus galpones?',
    tipo: 'opcion_unica',
    opciones: [
      A9_GALPON.BUENO,
      A9_GALPON.DETERIORADO,
      A9_GALPON.SIN_CONSTRUIR,
    ],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A11',
    saltos: null,
  },
  {
    codigo: 'A11',
    bloque: 'A',
    orden: 12,
    texto: '⚡ ¿Cómo es la energía en tu granja?',
    tipo: 'opcion_unica',
    opciones: [
      A11_ENERGIA.ESTABLE,
      A11_ENERGIA.CON_PLANTA,
      A11_ENERGIA.SOLO_PLANTA,
      A11_ENERGIA.INESTABLE,
    ],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A13',
    saltos: null,
  },
  {
    codigo: 'A13',
    bloque: 'A',
    orden: 14,
    texto: '📶 ¿Hay internet en la granja?',
    tipo: 'opcion_unica',
    opciones: [
      A13_INTERNET.ESTABLE,
      A13_INTERNET.INTERMITENTE,
      A13_INTERNET.SIN_SENAL,
    ],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A14',
    saltos: null,
  },

  // --- El dolor ---
  {
    codigo: 'A14',
    bloque: 'A',
    orden: 15,
    texto: '😖 ¿Qué es lo que más te preocupa hoy?',
    tipo: 'opcion_unica',
    opciones: textosDe(A14_DOLOR),
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: true,
    siguiente: 'A16',
    saltos: null,
  },
  {
    codigo: 'A16',
    bloque: 'A',
    orden: 17,
    texto:
      '📉 En el último año, ¿perdiste aves por calor, frío o humedad?',
    tipo: 'opcion_unica',
    opciones: textosDe(A16_MORTALIDAD),
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: true,
    siguiente: 'A18',
    saltos: null,
  },

  // --- La compra ---
  {
    codigo: 'A18',
    bloque: 'A',
    orden: 19,
    texto: '💳 ¿Cómo preferirías pagarlo?',
    tipo: 'opcion_unica',
    opciones: textosDe(A18_PAGO),
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: true,
    siguiente: 'A19',
    saltos: null,
  },
  {
    codigo: 'A19',
    bloque: 'A',
    orden: 20,
    texto: '🔍 ¿Estás viendo otras opciones además de AVISENS?',
    tipo: 'opcion_unica',
    opciones: textosDe(A19_URGENCIA),
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: true,
    siguiente: 'A20',
    saltos: null,
  },
  {
    codigo: 'A20',
    bloque: 'A',
    orden: 21,
    texto: '🤝 ¿La decisión de compra la tomas tú?',
    tipo: 'opcion_unica',
    opciones: textosDe(A20_DECIDE),
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: true,
    siguiente: 'C1',
    saltos: { No: 'A21' },
  },
  {
    codigo: 'A21',
    bloque: 'A',
    orden: 22,
    texto:
      '👥 ¿Con quién hablamos? Déjanos su nombre y un teléfono.',
    tipo: 'texto_libre',
    opciones: null,
    campo_prospecto: 'contacto_decisor',
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'C1',
    saltos: null,
  },

  // --- Contacto ---
  {
    codigo: 'C1',
    bloque: 'A',
    orden: 23,
    texto: '📞 ¿A qué número te llamamos?',
    tipo: 'texto_libre',
    opciones: null,
    campo_prospecto: 'telefono',
    omitir_si_canal: 'whatsapp',
    puntua: false,
    siguiente: 'C2',
    saltos: null,
  },
  {
    codigo: 'C2',
    bloque: 'A',
    orden: 24,
    texto: '📧 ¿Y tu correo? Ahí te enviamos la cotización.',
    tipo: 'texto_libre',
    opciones: null,
    campo_prospecto: 'email',
    omitir_si_canal: 'whatsapp',
    puntua: false,
    siguiente: 'FIN',
    saltos: null,
  },

  // =========================================================================
  // BLOQUE B — PQRS / CONSULTAS GENERALES (sin puntaje comercial)
  // =========================================================================

  // --- Peticiones ---
  {
    codigo: 'BMP',
    bloque: 'B',
    orden: 2,
    texto: '❓ ¿Sobre qué necesitas ayuda?',
    tipo: 'opcion_unica',
    opciones: [
      '¿Cuánto cuesta?',
      '¿Qué incluye?',
      '¿Sin internet estable?',
      '¿Cuánto tarda?',
      '¿Fácil de usar?',
      '¿Financiación?',
      '¿Y si se va la luz?',
      'Clientes en el Cauca',
      'Hablar con un asesor',
    ],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'BP1',
    saltos: {
      '¿Cuánto cuesta?': 'BP1',
      '¿Qué incluye?': 'BP2',
      '¿Sin internet estable?': 'BP3',
      '¿Cuánto tarda?': 'BP4',
      '¿Fácil de usar?': 'BP5',
      '¿Financiación?': 'BP6',
      '¿Y si se va la luz?': 'BP7',
      'Clientes en el Cauca': 'BP8',
      'Hablar con un asesor': 'A1',
    },
  },
  {
    codigo: 'BP1',
    bloque: 'B',
    orden: 3,
    texto:
      '💰 La instalación de AVISENS tiene un costo desde $3.500.000 COP, ' +
      'dependiendo del tamaño de la granja, el número de galpones y la cantidad ' +
      'de sensores que necesites. El valor incluye los equipos, la instalación ' +
      'y la configuración inicial.\n\n' +
      '¿Quieres que preparemos una cotización personalizada para tu granja?',
    tipo: 'si_no',
    opciones: ['Sí', 'No'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'FIN',
    saltos: { 'Sí': 'A1', No: 'FIN' },
  },
  {
    codigo: 'BP2',
    bloque: 'B',
    orden: 4,
    texto:
      '📦 AVISENS incluye sensores ambientales, unidad de comunicación, ' +
      'plataforma web y app, configuración e instalación técnica. La cantidad ' +
      'de sensores depende del número de galpones y de las necesidades de tu ' +
      'granja. También va incluida una capacitación básica para que puedas ' +
      'usarlo bien.\n\n' +
      '¿Quieres que preparemos una cotización personalizada para tu granja?',
    tipo: 'si_no',
    opciones: ['Sí', 'No'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'FIN',
    saltos: { 'Sí': 'A1', No: 'FIN' },
  },
  {
    codigo: 'BP3',
    bloque: 'B',
    orden: 5,
    texto:
      '📶 Sí. AVISENS está diseñado para trabajar en zonas rurales. Si la ' +
      'granja tiene internet inestable o poca cobertura celular, contamos con ' +
      'alternativas de comunicación y almacenamiento temporal de datos para ' +
      'mantener el monitoreo. Antes de instalar hacemos una evaluación de ' +
      'conectividad para elegir la mejor alternativa.\n\n' +
      '¿Quieres que preparemos una cotización personalizada para tu granja?',
    tipo: 'si_no',
    opciones: ['Sí', 'No'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'FIN',
    saltos: { 'Sí': 'A1', No: 'FIN' },
  },
  {
    codigo: 'BP4',
    bloque: 'B',
    orden: 6,
    texto:
      '⏱️ La instalación tarda entre 1 y 2 días por granja, según su tamaño y ' +
      'la cantidad de equipos. La hace nuestro equipo técnico, que instala, ' +
      'configura y verifica que todo quede funcionando.\n\n' +
      '¿Quieres que preparemos una cotización personalizada para tu granja?',
    tipo: 'si_no',
    opciones: ['Sí', 'No'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'FIN',
    saltos: { 'Sí': 'A1', No: 'FIN' },
  },
  {
    codigo: 'BP5',
    bloque: 'B',
    orden: 7,
    texto:
      '✅ No necesitas conocimientos técnicos avanzados. AVISENS está pensado ' +
      'para que sea fácil de usar: consultas los indicadores de tu granja y ' +
      'recibes las alertas desde el celular o el computador. Además te damos ' +
      'una capacitación básica durante la instalación.\n\n' +
      '¿Quieres que preparemos una cotización personalizada para tu granja?',
    tipo: 'si_no',
    opciones: ['Sí', 'No'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'FIN',
    saltos: { 'Sí': 'A1', No: 'FIN' },
  },
  {
    codigo: 'BP6',
    bloque: 'B',
    orden: 8,
    texto:
      '💳 Sí. Ofrecemos financiación hasta en 12 cuotas, sujeta a aprobación. ' +
      'También estamos trabajando en alianzas con cooperativas y entidades del ' +
      'sector agropecuario para facilitar el acceso a la tecnología.\n\n' +
      '¿Quieres que preparemos una cotización personalizada para tu granja?',
    tipo: 'si_no',
    opciones: ['Sí', 'No'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'FIN',
    saltos: { 'Sí': 'A1', No: 'FIN' },
  },
  {
    codigo: 'BP7',
    bloque: 'B',
    orden: 9,
    texto:
      '🔋 El sistema tiene respaldo energético para seguir monitoreando durante ' +
      'los cortes de electricidad. Según la configuración instalada, puede ' +
      'operar varias horas y guardar los datos para sincronizarlos cuando ' +
      'vuelva la energía.\n\n' +
      '¿Quieres que preparemos una cotización personalizada para tu granja?',
    tipo: 'si_no',
    opciones: ['Sí', 'No'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'FIN',
    saltos: { 'Sí': 'A1', No: 'FIN' },
  },
  {
    codigo: 'BP8',
    bloque: 'B',
    orden: 10,
    texto:
      '📍 Sí, tenemos clientes en el Cauca. Podemos gestionar una referencia ' +
      'comercial o, cuando el cliente lo autorice, coordinar una visita para ' +
      'que veas de primera mano cómo funciona AVISENS en una granja.\n\n' +
      '¿Quieres que preparemos una cotización personalizada para tu granja?',
    tipo: 'si_no',
    opciones: ['Sí', 'No'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'FIN',
    saltos: { 'Sí': 'A1', No: 'FIN' },
  },

  // --- Reclamos ---

  // --- Quejas ---

  // --- Sugerencias ---

  // --- Tramites ---

  // --- Radicacion PQRS ---
  // =========================================================================
  // BLOQUE S — SOPORTE A CLIENTES (PQRS)
  // =========================================================================
  // Solo para quien ya compro. Aqui SI se pide la cedula, porque sirve para
  // ubicar su granja y su contrato: es el unico sitio del chatbot donde ese
  // dato hace un trabajo. En la cotizacion se retiro justamente por eso.
  //
  // Tres preguntas y se radica. La version anterior tenia dieciseis, con una
  // respuesta guionizada por cada tipo de falla; eso no es soporte, es un
  // arbol de respuestas que envejece mal. Quien tiene un problema quiere
  // contarlo y que alguien lo lea.
  {
    codigo: 'S1',
    bloque: 'S',
    orden: 200,
    texto:
      '🪪 Para ubicar tu granja y tu contrato, ¿cuál es tu número de cédula?',
    tipo: 'texto_libre',
    opciones: null,
    campo_prospecto: 'documento',
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'S2',
    saltos: null,
  },
  {
    codigo: 'S2',
    bloque: 'S',
    orden: 201,
    texto: '🛠️ ¿Qué está pasando?',
    tipo: 'opcion_unica',
    opciones: [
      'Los sensores no reportan',
      'Las alertas no llegan o llegan tarde',
      'Un cobro que no cuadra',
      'Una visita o instalación pendiente',
      'Quiero sugerir una mejora',
      'Otra cosa',
    ],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'S3',
    saltos: null,
  },
  {
    codigo: 'S3',
    bloque: 'S',
    orden: 202,
    texto:
      '📝 Cuéntanos qué pasó, con el detalle que puedas. ' +
      'Entre más nos digas, más rápido lo resolvemos.',
    tipo: 'texto_libre',
    opciones: null,
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'FIN',
    saltos: null,
  },
];

// ---------------------------------------------------------------------------
// !!! PRECIOS PROVISIONALES !!!
// Estos valores NO son los precios reales de Avisens. Se pusieron para poder
// construir y demostrar el modulo de cotizacion (2026-08-20). ANTES de mostrar
// una cotizacion a un cliente real o en la sustentacion, reemplazarlos por la
// lista de precios oficial. Se cambian en la tabla catalogo_sensores, sin
// desplegar: basta editar aqui y re-correr el seed.
// ---------------------------------------------------------------------------
const CATALOGO_SENSORES = [
  {
    tipo_sensor: 'nodo_esp32',
    nombre: 'Nodo de control ESP32',
    descripcion: 'Concentra los sensores del galpon y reporta por MQTT',
    precio_unitario_cop: 250000,
    cobertura_m2: null,
    obligatorio: true,
  },
  {
    tipo_sensor: 'temperatura_humedad',
    nombre: 'Sensor de temperatura y humedad',
    descripcion: 'Mide el ambiente del galpon; uno cada 120 m2',
    precio_unitario_cop: 180000,
    cobertura_m2: 120,
    obligatorio: true,
  },
  {
    tipo_sensor: 'amoniaco',
    nombre: 'Sensor de amoniaco (NH3)',
    descripcion: 'Detecta acumulacion por mala ventilacion o cama humeda',
    precio_unitario_cop: 320000,
    cobertura_m2: null,
    obligatorio: true,
  },
  {
    tipo_sensor: 'nivel_agua',
    nombre: 'Sensor de nivel de agua',
    descripcion: 'Vigila el consumo de agua, el primer aviso de enfermedad',
    precio_unitario_cop: 150000,
    cobertura_m2: null,
    obligatorio: true,
  },
  {
    tipo_sensor: 'co2',
    nombre: 'Sensor de dioxido de carbono',
    descripcion: 'Opcional: control fino de la ventilacion',
    precio_unitario_cop: 450000,
    cobertura_m2: null,
    obligatorio: false,
  },
  {
    tipo_sensor: 'luminosidad',
    nombre: 'Sensor de luminosidad',
    descripcion: 'Opcional: programas de luz; uno cada 300 m2',
    precio_unitario_cop: 90000,
    cobertura_m2: 300,
    obligatorio: false,
  },

];

export async function sembrarCatalogoSensores(prisma: PrismaClient) {
  for (const sensor of CATALOGO_SENSORES) {
    const datos = { ...sensor, cobertura_m2: sensor.cobertura_m2 ?? null };
    await prisma.catalogoSensor.upsert({
      where: { tipo_sensor: sensor.tipo_sensor },
      update: datos,
      create: datos,
    });
  }
}

export async function sembrarPreguntasChatbot(prisma: PrismaClient) {
  for (const pregunta of PREGUNTAS_CHATBOT) {
    const datos = {
      ...pregunta,
      opciones: pregunta.opciones ?? Prisma.DbNull,
      saltos: pregunta.saltos ?? Prisma.DbNull,
      activa: true,
    };
    await prisma.preguntaChatbot.upsert({
      where: { codigo: pregunta.codigo },
      update: datos,
      create: datos,
    });
  }

  // Las preguntas que se retiran del cuestionario se desactivan, no se borran:
  // los prospectos que ya las respondieron conservan su historial, y el flujo
  // deja de ofrecerlas. Sin esto, quitar una pregunta del seed la dejaba viva
  // en cualquier base que ya la tuviera.
  const vigentes = PREGUNTAS_CHATBOT.map((p) => p.codigo);
  await prisma.preguntaChatbot.updateMany({
    where: { codigo: { notIn: vigentes }, activa: true },
    data: { activa: false },
  });
}

export async function sembrarMatrizCalificacion(prisma: PrismaClient) {
  for (const fila of MATRIZ_CALIFICACION) {
    await prisma.matrizCalificacion.upsert({
      where: {
        codigo_pregunta_opcion_respuesta: {
          codigo_pregunta: fila.codigo_pregunta,
          opcion_respuesta: fila.opcion_respuesta,
        },
      },
      update: fila,
      create: fila,
    });
  }

  // Las filas que salen del modelo se desactivan, igual que las preguntas.
  // Sin esto, cambiar el puntaje de una pregunta dejaba viva la fila anterior
  // y el maximo dejaba de cuadrar: el upsert agrega, no reemplaza.
  const vigentes = MATRIZ_CALIFICACION.map((f) => f.codigo_pregunta);
  await prisma.matrizCalificacion.updateMany({
    where: { codigo_pregunta: { notIn: vigentes }, activa: true },
    data: { activa: false },
  });

  // Y dentro de las preguntas que siguen calificando, las redacciones que ya
  // no se usan tampoco deben puntuar.
  for (const [codigo, opciones] of Object.entries(OPCIONES_CALIFICADAS)) {
    await prisma.matrizCalificacion.updateMany({
      where: {
        codigo_pregunta: codigo,
        opcion_respuesta: { notIn: opciones.map((o) => o.texto) },
        activa: true,
      },
      data: { activa: false },
    });
  }
}

