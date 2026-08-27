import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

const MATRIZ_CALIFICACION = [
  {
    bloque: 'A',
    codigo_pregunta: 'A8',
    opcion_respuesta: '<1000',
    puntaje: 0,
    descripcion: 'Escala de la operacion (HU-03)',
  },
  {
    bloque: 'A',
    codigo_pregunta: 'A8',
    opcion_respuesta: '1000-5000',
    puntaje: 2,
    descripcion: 'Escala de la operacion (HU-03)',
  },
  {
    bloque: 'A',
    codigo_pregunta: 'A8',
    opcion_respuesta: '5000-10000',
    puntaje: 3,
    descripcion: 'Escala de la operacion (HU-03)',
  },
  {
    bloque: 'A',
    codigo_pregunta: 'A8',
    opcion_respuesta: '>10000',
    puntaje: 4,
    descripcion: 'Escala de la operacion (HU-03)',
  },
  {
    bloque: 'A',
    codigo_pregunta: 'A16',
    opcion_respuesta: 'Sí, más de una vez',
    puntaje: 3,
    descripcion: 'Dolor declarado (HU-02)',
  },
  {
    bloque: 'A',
    codigo_pregunta: 'A16',
    opcion_respuesta: 'Una vez',
    puntaje: 2,
    descripcion: 'Dolor declarado (HU-02)',
  },
  {
    bloque: 'A',
    codigo_pregunta: 'A16',
    opcion_respuesta: 'No',
    puntaje: 0,
    descripcion: 'Dolor declarado (HU-02)',
  },
  {
    bloque: 'A',
    codigo_pregunta: 'A16',
    opcion_respuesta: 'No sé la causa',
    puntaje: 0,
    descripcion: 'Dolor declarado (HU-02)',
  },
  {
    bloque: 'A',
    codigo_pregunta: 'A18',
    opcion_respuesta: 'Compra directa',
    puntaje: 3,
    descripcion: 'Presupuesto y adquisicion (HU-04)',
  },
  {
    bloque: 'A',
    codigo_pregunta: 'A18',
    opcion_respuesta: 'Suscripción',
    puntaje: 3,
    descripcion: 'Presupuesto y adquisicion (HU-04)',
  },
  {
    bloque: 'A',
    codigo_pregunta: 'A18',
    opcion_respuesta: 'El más conveniente',
    puntaje: 1,
    descripcion: 'Presupuesto y adquisicion (HU-04)',
  },
  {
    bloque: 'A',
    codigo_pregunta: 'A18',
    opcion_respuesta: 'No sé',
    puntaje: 0,
    descripcion: 'Presupuesto y adquisicion (HU-04)',
  },
  {
    bloque: 'A',
    codigo_pregunta: 'A9',
    opcion_respuesta: 'Sí, en buen estado',
    puntaje: 1,
    descripcion: 'Infraestructura habilitante (HU-03)',
  },
  {
    bloque: 'A',
    codigo_pregunta: 'A11',
    opcion_respuesta: 'Eléctrico estable',
    puntaje: 1,
    descripcion: 'Infraestructura habilitante (HU-03)',
  },
  {
    bloque: 'A',
    codigo_pregunta: 'A13',
    opcion_respuesta: 'Sí, estable',
    puntaje: 1,
    descripcion: 'Infraestructura habilitante (HU-03)',
  },
  {
    bloque: 'A',
    codigo_pregunta: 'A19',
    opcion_respuesta: 'Ya tengo cotizaciones',
    puntaje: 3,
    descripcion: 'Urgencia y competencia (HU-05)',
  },
  {
    bloque: 'A',
    codigo_pregunta: 'A19',
    opcion_respuesta: 'Mirando opciones',
    puntaje: 1,
    descripcion: 'Urgencia y competencia (HU-05)',
  },
  {
    bloque: 'A',
    codigo_pregunta: 'A19',
    opcion_respuesta: 'Solo AVISENS',
    puntaje: 0,
    descripcion: 'Urgencia y competencia (HU-05)',
  },
  {
    bloque: 'A',
    codigo_pregunta: 'A19',
    opcion_respuesta: 'No sé qué más existe',
    puntaje: 0,
    descripcion: 'Urgencia y competencia (HU-05)',
  },
];

const PREGUNTAS_CHATBOT = [
  // =========================================================================
  // MENU PRINCIPAL
  // =========================================================================
  {
    codigo: 'M1',
    bloque: 'M',
    orden: 0,
    texto:
      '👋 ¡Hola! Soy *AVIA*, la asistente virtual de AVISENS 🐔\n\n' +
      'Monitoreamos granjas avícolas con sensores de temperatura, humedad y ' +
      'ventilación para que sepas lo que pasa en el galpón antes de perder aves.\n\n' +
      '¿En qué te puedo ayudar hoy?',
    tipo: 'opcion_unica',
    opciones: ['Quiero cotizar', 'Tengo dudas primero'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A1',
    saltos: { 'Quiero cotizar': 'A1', 'Tengo dudas primero': 'BMP' },
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
    texto: '👤 ¿Cuál es tu nombre completo?',
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
    texto: '🏘️ ¿Cuántos galpones tienes en tu granja?',
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
    texto: '🏠 ¿Qué tamaño tiene el galpón en metros cuadrados?',
    tipo: 'opcion_unica',
    opciones: [
      'Menos de 200 m²',
      '200 - 500 m²',
      '500 - 1.000 m²',
      'Más de 1.000 m²',
      'Otro, lo escribo',
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
    texto: '🐔 ¿Cuántas aves almacenas actualmente en total en tus galpones?',
    tipo: 'opcion_unica',
    opciones: ['<1000', '1000-5000', '5000-10000', '>10000'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: true,
    siguiente: 'A9',
    saltos: null,
  },
  {
    codigo: 'A9',
    bloque: 'A',
    orden: 10,
    texto: '🏗️ ¿El galpón ya está construido y en buenas condiciones?',
    tipo: 'opcion_unica',
    opciones: ['Sí, en buen estado', 'Construido, mal estado', 'No está construido'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: true,
    siguiente: 'A11',
    saltos: null,
  },
  {
    codigo: 'A11',
    bloque: 'A',
    orden: 12,
    texto: '⚡ ¿Cómo es el suministro eléctrico en tu granja?',
    tipo: 'opcion_unica',
    opciones: ['Eléctrico estable', 'Planta de respaldo', 'Solo planta', 'No'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: true,
    siguiente: 'A13',
    saltos: null,
  },
  {
    codigo: 'A13',
    bloque: 'A',
    orden: 14,
    texto: '📶 ¿Tienes internet (WiFi o datos móviles) dentro de la granja?',
    tipo: 'opcion_unica',
    opciones: ['Sí, estable', 'Sí, pero intermitente', 'No, zona rural sin señal'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: true,
    siguiente: 'A14',
    saltos: null,
  },

  // --- El dolor ---
  {
    codigo: 'A14',
    bloque: 'A',
    orden: 15,
    texto: '😖 ¿Cuál es tu mayor dolor de cabeza hoy en la granja?',
    tipo: 'opcion_unica',
    opciones: [
      'Mortalidad por calor o frío',
      'Consumo de alimento descontrolado',
      'Humedad y amoniaco',
      'Enfermedades respiratorias',
      'Ninguno en particular',
    ],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A16',
    saltos: null,
  },
  {
    codigo: 'A16',
    bloque: 'A',
    orden: 17,
    texto:
      '📉 ¿Has tenido mortalidad elevada por condiciones ambientales en los ' +
      'últimos 12 meses?',
    tipo: 'opcion_unica',
    opciones: ['Sí, más de una vez', 'Una vez', 'No', 'No sé la causa'],
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
    texto:
      '💳 ¿Buscas adquirir la solución o prefieres un modelo de suscripción ' +
      'mensual?',
    tipo: 'opcion_unica',
    opciones: ['Compra directa', 'Suscripción', 'El más conveniente', 'No sé'],
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
    texto: '🔍 ¿Estás evaluando otras soluciones o plataformas similares?',
    tipo: 'opcion_unica',
    opciones: ['Ya tengo cotizaciones', 'Mirando opciones', 'Solo AVISENS', 'No sé qué más existe'],
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
    texto: '🤝 ¿Eres tú quien toma la decisión de compra?',
    tipo: 'opcion_unica',
    opciones: ['Sí', 'No'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'C1',
    saltos: { No: 'A21' },
  },
  {
    codigo: 'A21',
    bloque: 'A',
    orden: 22,
    texto:
      '👥 ¿Con quién debemos hablar? Déjanos su nombre y un número de contacto.',
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
    texto: '📞 ¿A qué número de teléfono te podemos contactar?',
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
    texto: '📧 ¿Cuál es tu correo electrónico?',
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
}
