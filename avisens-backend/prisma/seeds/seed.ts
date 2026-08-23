import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL']!,
});
const prisma = new PrismaClient({ adapter });

// Crea los tres roles del sistema. No son secretos: la app los necesita para
// funcionar, así que se siembran siempre (idempotente con upsert).
async function sembrarRoles() {
  const rolAdmin = await prisma.rol.upsert({
    where: { nombre: 'Administrador' },
    update: {},
    create: {
      nombre: 'Administrador',
      descripcion: 'Control total del sistema',
    },
  });
  await prisma.rol.upsert({
    where: { nombre: 'Propietario' },
    update: {},
    create: { nombre: 'Propietario', descripcion: 'Gestiona sus granjas' },
  });
  await prisma.rol.upsert({
    where: { nombre: 'Operario' },
    update: {},
    create: { nombre: 'Operario', descripcion: 'Registra datos de su galpón' },
  });
  return rolAdmin;
}

// Crea el ÚNICO administrador (Avisens) a partir de variables de entorno.
// Nunca hay credenciales quemadas en el código: si no se configuran, no se crea.
async function sembrarAdmin(rolAdminId: number) {
  const email = process.env['ADMIN_EMAIL'];
  const password = process.env['ADMIN_PASSWORD'];

  // Sin configurar → no se crea admin (solo quedaron los roles). Es válido.
  if (!email && !password) {
    console.warn(
      'ADMIN_EMAIL / ADMIN_PASSWORD no definidos: no se crea administrador ' +
        '(solo se sembraron los roles).',
    );
    return;
  }

  // Configuración a medias o débil → falla fuerte (mejor romper que dejar un hueco).
  if (!email || !password) {
    throw new Error(
      'Define AMBAS variables ADMIN_EMAIL y ADMIN_PASSWORD para crear el administrador.',
    );
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 8 caracteres.');
  }

  const nombre = process.env['ADMIN_NOMBRE'] ?? 'Administrador Avisens';
  const cedula = process.env['ADMIN_CEDULA'] ?? '0000000000';

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log(`El administrador ya existe (${email}); no se modifica.`);
    return;
  }

  await prisma.usuario.create({
    data: {
      nombre_completo: nombre,
      cedula,
      email,
      password_hash: await bcrypt.hash(password, 12),
      rol_id: rolAdminId,
    },
  });
  // Nunca se imprime la contraseña.
  console.log(`Administrador creado: ${email}`);
}

const CURVA_ITALCOL = [
  {
    sexo: 'macho',
    dia: 7,
    peso_esperado_g: 211,
    consumo_acumulado_g: 164,
    fcr_objetivo: 0.78,
    etapa_alimentacion: 'preiniciador',
    temperatura_min: 28,
    temperatura_max: 30,
  },
  {
    sexo: 'macho',
    dia: 14,
    peso_esperado_g: 535,
    consumo_acumulado_g: 551,
    fcr_objetivo: 1.03,
    etapa_alimentacion: 'iniciacion',
    temperatura_min: 28,
    temperatura_max: 28,
  },
  {
    sexo: 'macho',
    dia: 21,
    peso_esperado_g: 1035,
    consumo_acumulado_g: 1218,
    fcr_objetivo: 1.18,
    etapa_alimentacion: 'iniciacion',
    temperatura_min: 26,
    temperatura_max: 26,
  },
  {
    sexo: 'macho',
    dia: 28,
    peso_esperado_g: 1681,
    consumo_acumulado_g: 2199,
    fcr_objetivo: 1.31,
    etapa_alimentacion: 'engorde',
    temperatura_min: null,
    temperatura_max: null,
  },
  {
    sexo: 'macho',
    dia: 35,
    peso_esperado_g: 2421,
    consumo_acumulado_g: 3483,
    fcr_objetivo: 1.44,
    etapa_alimentacion: 'engorde',
    temperatura_min: null,
    temperatura_max: null,
  },
  {
    sexo: 'macho',
    dia: 42,
    peso_esperado_g: 3100,
    consumo_acumulado_g: 5023,
    fcr_objetivo: 1.57,
    etapa_alimentacion: 'engorde',
    temperatura_min: null,
    temperatura_max: null,
  },

  {
    sexo: 'hembra',
    dia: 7,
    peso_esperado_g: 211,
    consumo_acumulado_g: 178,
    fcr_objetivo: 0.84,
    etapa_alimentacion: 'preiniciador',
    temperatura_min: 28,
    temperatura_max: 30,
  },
  {
    sexo: 'hembra',
    dia: 14,
    peso_esperado_g: 523,
    consumo_acumulado_g: 555,
    fcr_objetivo: 1.06,
    etapa_alimentacion: 'iniciacion',
    temperatura_min: 28,
    temperatura_max: 28,
  },
  {
    sexo: 'hembra',
    dia: 21,
    peso_esperado_g: 980,
    consumo_acumulado_g: 1177,
    fcr_objetivo: 1.2,
    etapa_alimentacion: 'iniciacion',
    temperatura_min: 26,
    temperatura_max: 26,
  },
  {
    sexo: 'hembra',
    dia: 28,
    peso_esperado_g: 1548,
    consumo_acumulado_g: 2069,
    fcr_objetivo: 1.33,
    etapa_alimentacion: 'engorde',
    temperatura_min: null,
    temperatura_max: null,
  },
  {
    sexo: 'hembra',
    dia: 35,
    peso_esperado_g: 2176,
    consumo_acumulado_g: 3213,
    fcr_objetivo: 1.48,
    etapa_alimentacion: 'engorde',
    temperatura_min: null,
    temperatura_max: null,
  },
  {
    sexo: 'hembra',
    dia: 42,
    peso_esperado_g: 2700,
    consumo_acumulado_g: 4557,
    fcr_objetivo: 1.62,
    etapa_alimentacion: 'engorde',
    temperatura_min: null,
    temperatura_max: null,
  },
].map((fila) => ({ ...fila, marca: 'italcol', fuente: 'italcol' }));

const CURVA_SOLLA = [
  {
    marca: 'solla',
    fuente: 'solla-clima-calido',
    sexo: 'mixto',
    dia: 7,
    peso_esperado_g: 160,
    etapa_alimentacion: 'preiniciacion',
  },
  {
    marca: 'solla',
    fuente: 'solla-clima-calido',
    sexo: 'mixto',
    dia: 14,
    peso_esperado_g: 370,
    etapa_alimentacion: 'iniciacion',
  },
  {
    marca: 'solla',
    fuente: 'solla-clima-calido',
    sexo: 'mixto',
    dia: 21,
    peso_esperado_g: 780,
    etapa_alimentacion: 'iniciacion',
  },
  {
    marca: 'solla',
    fuente: 'solla-clima-calido',
    sexo: 'mixto',
    dia: 28,
    peso_esperado_g: 1250,
    etapa_alimentacion: 'engorde',
  },
  {
    marca: 'solla',
    fuente: 'solla-clima-calido',
    sexo: 'mixto',
    dia: 35,
    peso_esperado_g: 1750,
    etapa_alimentacion: 'engorde',
  },
  {
    marca: 'solla',
    fuente: 'solla-clima-calido',
    sexo: 'mixto',
    dia: 42,
    peso_esperado_g: 2250,
    fcr_objetivo: 1.85,
    etapa_alimentacion: 'engorde',
  },
];

const CURVAS_OBJETIVO = [...CURVA_ITALCOL, ...CURVA_SOLLA];

async function sembrarCurvasObjetivo() {
  for (const fila of CURVAS_OBJETIVO) {
    await prisma.curvaObjetivo.upsert({
      where: {
        marca_sexo_dia: { marca: fila.marca, sexo: fila.sexo, dia: fila.dia },
      },
      update: fila,
      create: fila,
    });
  }
}

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
    opcion_respuesta: 'Lo que sea más conveniente',
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
    opcion_respuesta:
      'Sí, está construido y se encuentra en buenas condiciones',
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
    opcion_respuesta: 'Sí, ya tengo cotizaciones',
    puntaje: 3,
    descripcion: 'Urgencia y competencia (HU-05)',
  },
  {
    bloque: 'A',
    codigo_pregunta: 'A19',
    opcion_respuesta: 'Estoy mirando opciones',
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
  {
    codigo: 'M1',
    bloque: 'M',
    orden: 0,
    texto: 
      'Hola, soy AVIA, el asistente de AVISENS.\n\n' +
      'Monitoreamos granjas avícolas con sensores de temperatura, humedad y ' +
      'ventilación, para que sepas lo que pasa en el galpón antes de perder aves.\n\n' +
      '¿En qué te puedo ayudar?',
    tipo: 'opcion_unica',
    opciones: ['Cotizar un sistema', 'Otra consulta o PQRS'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A1',
    saltos: { 'Cotizar un sistema': 'A1', 'Otra consulta o PQRS': 'B1' },
  },
  {
    codigo: 'A1',
    bloque: 'A',
    orden: 1,
    texto: 
      '¿Autorizas el tratamiento de datos según la ley de Hábeas Data?\n\n' +
      'Puedes consultar nuestra política en ' +
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
    texto: '¿Cuál es tu nombre y el nombre de tu granja?',
    tipo: 'texto_libre',
    opciones: null,
    campo_prospecto: 'nombre',
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A3',
    saltos: null,
  },
  {
    codigo: 'A3',
    bloque: 'A',
    orden: 3,
    texto: '¿Cuál es el número de tu documento de identidad (cédula)?',
    tipo: 'texto_libre',
    opciones: null,
    campo_prospecto: 'documento',
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A4',
    saltos: null,
  },
  {
    codigo: 'A4',
    bloque: 'A',
    orden: 4,
    texto: '¿En qué municipio y departamento está ubicada tu granja?',
    tipo: 'texto_libre',
    opciones: null,
    campo_prospecto: 'municipio',
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A5',
    saltos: null,
  },
  {
    codigo: 'A5',
    bloque: 'A',
    orden: 5,
    texto: '¿Qué tamaño en metros cuadrados tiene la granja?',
    tipo: 'numero',
    opciones: null,
    campo_prospecto: 'area_granja_m2',
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A6',
    saltos: null,
  },
  {
    codigo: 'A6',
    bloque: 'A',
    orden: 6,
    texto: '¿Qué tamaño en metros cuadrados tiene el galpón?',
    tipo: 'numero',
    opciones: null,
    campo_prospecto: 'area_galpon_m2',
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A7',
    saltos: null,
  },
  {
    codigo: 'A7',
    bloque: 'A',
    orden: 7,
    texto: '¿Cuántas aves maneja cada galpón en promedio?',
    tipo: 'opcion_unica',
    opciones: ['<1000', '1000-5000', '5000-10000', '>10000'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A8',
    saltos: null,
  },
  {
    codigo: 'A8',
    bloque: 'A',
    orden: 8,
    texto: '¿Cuántas aves en total almacena actualmente en sus galpones?',
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
    orden: 9,
    texto: 
      '¿El galpón (infraestructura física) actualmente está construido y se ' +
      'encuentra en buenas condiciones?',
    tipo: 'opcion_unica',
    opciones: ['Sí, está construido y se encuentra en buenas condiciones', 'Sí, está construido pero no está en buenas condiciones', 'No está construido'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: true,
    siguiente: 'A10',
    saltos: null,
  },
  {
    codigo: 'A10',
    bloque: 'A',
    orden: 10,
    texto: 
      '¿Su granja está ubicada en una zona donde hay presencia de árboles altos ' +
      'que sirven como rompe vientos y mejoran la circulación?',
    tipo: 'opcion_unica',
    opciones: ['Sí', 'No'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A11',
    saltos: null,
  },
  {
    codigo: 'A11',
    bloque: 'A',
    orden: 11,
    texto: '¿Tienes un sistema eléctrico estable o dependes de planta eléctrica?',
    tipo: 'opcion_unica',
    opciones: ['Eléctrico estable', 'Planta de respaldo', 'Solo planta', 'No'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: true,
    siguiente: 'A12',
    saltos: null,
  },
  {
    codigo: 'A12',
    bloque: 'A',
    orden: 12,
    texto: '¿Tienes una fuente de agua cercana y confiable?',
    tipo: 'opcion_unica',
    opciones: ['Sí, un riachuelo cercano', 'Sí, un río cercano', 'Sí, una quebrada cercana', 'Sí, un pozo de agua', 'No'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A13',
    saltos: null,
  },
  {
    codigo: 'A13',
    bloque: 'A',
    orden: 13,
    texto: 
      '¿Tienes conectividad a internet (WiFi o datos móviles) dentro de la granja?',
    tipo: 'opcion_unica',
    opciones: ['Sí, estable', 'Sí, pero intermitente', 'No, zona rural sin señal'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: true,
    siguiente: 'A14',
    saltos: null,
  },
  {
    codigo: 'A14',
    bloque: 'A',
    orden: 14,
    texto: 
      'Describe cuáles son las principales problemáticas que se te han presentado ' +
      'en la cría de pollos de engorde',
    tipo: 'texto_libre',
    opciones: null,
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A15',
    saltos: null,
  },
  {
    codigo: 'A15',
    bloque: 'A',
    orden: 15,
    texto: 'Especifica cuáles son las principales causas de muerte de las aves',
    tipo: 'texto_libre',
    opciones: null,
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A16',
    saltos: null,
  },
  {
    codigo: 'A16',
    bloque: 'A',
    orden: 16,
    texto: 
      '¿Has tenido mortalidad elevada por condiciones ambientales en los ' +
      'últimos 12 meses?',
    tipo: 'opcion_unica',
    opciones: ['Sí, más de una vez', 'Una vez', 'No', 'No sé la causa'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: true,
    siguiente: 'A17',
    saltos: null,
  },
  {
    codigo: 'A17',
    bloque: 'A',
    orden: 17,
    texto: 
      '¿Has invertido antes en tecnología para tu granja (sensores, software, ' +
      'automatización)?',
    tipo: 'opcion_unica',
    opciones: ['Sí', 'No', 'Estoy evaluándolo por primera vez'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A18',
    saltos: null,
  },
  {
    codigo: 'A18',
    bloque: 'A',
    orden: 18,
    texto: 
      '¿Estás buscando una solución para adquirir o prefieres un modelo de ' +
      'suscripción mensual?',
    tipo: 'opcion_unica',
    opciones: ['Compra directa', 'Suscripción', 'Lo que sea más conveniente', 'No sé'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: true,
    siguiente: 'A19',
    saltos: null,
  },
  {
    codigo: 'A19',
    bloque: 'A',
    orden: 19,
    texto: '¿Estás evaluando otras soluciones o plataformas similares?',
    tipo: 'opcion_unica',
    opciones: ['Sí, ya tengo cotizaciones', 'Estoy mirando opciones', 'Solo AVISENS', 'No sé qué más existe'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: true,
    siguiente: 'A20',
    saltos: null,
  },
  {
    codigo: 'A20',
    bloque: 'A',
    orden: 20,
    texto: '¿Eres la persona que toma la decisión de compra?',
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
    orden: 21,
    texto: 
      '¿Con quién debemos hablar? Déjanos su nombre y un número de contacto',
    tipo: 'texto_libre',
    opciones: null,
    campo_prospecto: 'contacto_decisor',
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'C1',
    saltos: null,
  },
  {
    codigo: 'C1',
    bloque: 'A',
    orden: 22,
    texto: '¿A qué número de teléfono te podemos contactar?',
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
    orden: 23,
    texto: '¿Cuál es tu correo electrónico?',
    tipo: 'texto_libre',
    opciones: null,
    campo_prospecto: 'email',
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'FIN',
    saltos: null,
  },

  {
    codigo: 'B1',
    bloque: 'B',
    orden: 1,
    texto: '¿Qué tipo de solicitud quieres radicar?\n\nAl radicarla aceptas nuestra política de tratamiento de datos: https://avisens-project-production.up.railway.app/privacidad',
    tipo: 'opcion_unica',
    opciones: ['Petición', 'Queja', 'Reclamo', 'Sugerencia', 'Felicitación'],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'B2',
    saltos: null,
  },
  {
    codigo: 'B2',
    bloque: 'B',
    orden: 2,
    texto: '¿Cuál es el asunto de tu solicitud?',
    tipo: 'texto_libre',
    opciones: null,
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'B3',
    saltos: null,
  },
  {
    codigo: 'B3',
    bloque: 'B',
    orden: 3,
    texto: 'Cuéntanos con detalle qué sucedió',
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

async function sembrarCatalogoSensores() {
  for (const sensor of CATALOGO_SENSORES) {
    const datos = { ...sensor, cobertura_m2: sensor.cobertura_m2 ?? null };
    await prisma.catalogoSensor.upsert({
      where: { tipo_sensor: sensor.tipo_sensor },
      update: datos,
      create: datos,
    });
  }
}

async function sembrarPreguntasChatbot() {
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
}

async function sembrarMatrizCalificacion() {
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

const CATEGORIAS_FINANCIERAS = [
  { nombre: 'Venta de aves', tipo: 'ingreso' },
  { nombre: 'Compra de pollitos', tipo: 'egreso' },
  { nombre: 'Compra de alimento', tipo: 'egreso' },
  { nombre: 'Sanidad y vacunas', tipo: 'egreso' },
  { nombre: 'Servicios e insumos', tipo: 'egreso' },
];

async function sembrarCategoriasFinancieras() {
  for (const categoria of CATEGORIAS_FINANCIERAS) {
    const existente = await prisma.categoriaFinanciera.findFirst({
      where: { nombre: categoria.nombre },
    });
    if (!existente) {
      await prisma.categoriaFinanciera.create({ data: categoria });
    }
  }
}

// ---------------------------------------------------------------------------
// Datos de demostracion. Solo se siembran con SEED_DEMO=true, para no meter
// lotes ficticios en una base con datos reales. Las fechas son relativas a hoy
// para que la demo siempre se vea actual.
// ---------------------------------------------------------------------------
function hace(dias: number) {
  const f = new Date();
  f.setUTCDate(f.getUTCDate() - dias);
  f.setUTCHours(0, 0, 0, 0);
  return f;
}

const DIAS_MEDIDOS = [7, 14, 21, 28];

const LOTES_DEMO = [
  {
    codigo: 'L-DEMO-01',
    galpon_codigo: 'GD-01',
    galpon_nombre: 'Galpon 1 (demo)',
    cantidad_inicial: 1000,
    // Sigue la curva Italcol (211/535/1035/1681): peso en objetivo y buena conversion.
    pesos_g: [205, 540, 1040, 1690],
    // Incrementos DIARIOS, no acumulados: suman 2199 kg, el consumo del manual.
    alimento_kg: [164, 387, 667, 981],
    muertes: [8, 4, 3, 3],
  },
  {
    codigo: 'L-DEMO-02',
    galpon_codigo: 'GD-02',
    galpon_nombre: 'Galpon 2 (demo)',
    cantidad_inicial: 1000,
    // Lote CON PROBLEMAS: ~20% por debajo de la curva. Dispara la alerta de
    // desvio y las recomendaciones. Come parecido pero crece menos: peor FCR.
    pesos_g: [180, 450, 850, 1350],
    alimento_kg: [170, 400, 700, 1000],
    muertes: [20, 25, 30, 35],
  },
];

async function sembrarDatosDemo() {
  if (process.env.SEED_DEMO !== 'true') return;

  const admin = await prisma.usuario.findFirst({ orderBy: { id: 'asc' } });
  if (!admin) {
    console.log('Seed demo omitido: no hay usuario admin');
    return;
  }

  const proveedor = await prisma.proveedor.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nombre: 'Incubadora Santander (demo)',
      nit: '900123456-1',
      tipo_proveedor: 'pollitos',
    },
  });

  let granja = await prisma.granja.findFirst({
    where: { nombre: 'Granja La Esperanza (demo)' },
  });
  granja ??= await prisma.granja.create({
    data: {
      propietario_id: admin.id,
      nombre: 'Granja La Esperanza (demo)',
      municipio: 'Piedecuesta',
      departamento: 'Santander',
    },
  });

  const ingreso = hace(28);

  for (const demo of LOTES_DEMO) {
    const galpon = await prisma.galpon.upsert({
      where: {
        granja_id_codigo: {
          granja_id: granja.id,
          codigo: demo.galpon_codigo,
        },
      },
      update: {},
      create: {
        granja_id: granja.id,
        codigo: demo.galpon_codigo,
        nombre: demo.galpon_nombre,
        capacidad_aves: 1200,
        largo_metros: 60,
        ancho_metros: 20,
      },
    });

    const lote = await prisma.lote.upsert({
      where: { codigo: demo.codigo },
      update: { fecha_ingreso: ingreso },
      create: {
        galpon_id: galpon.id,
        proveedor_id: proveedor.id,
        codigo: demo.codigo,
        fecha_ingreso: ingreso,
        cantidad_inicial: demo.cantidad_inicial,
        raza: 'Cobb 500',
        sexo: 'macho',
        marca_alimento: 'italcol',
        costo_pollito_unitario: 1800,
        estado: 'activo',
      },
    });

    // Se rehacen las series completas: asi re-sembrar no duplica registros.
    await prisma.pesaje.deleteMany({ where: { lote_id: lote.id } });
    await prisma.consumoDiario.deleteMany({ where: { lote_id: lote.id } });
    await prisma.registroMortalidad.deleteMany({ where: { lote_id: lote.id } });

    await prisma.pesaje.createMany({
      data: DIAS_MEDIDOS.map((dia, i) => ({
        lote_id: lote.id,
        usuario_id: admin.id,
        fecha: hace(28 - dia),
        peso_promedio_g: demo.pesos_g[i],
        cantidad_aves_pesadas: 50,
        metodo_registro: 'manual',
      })),
    });

    await prisma.consumoDiario.createMany({
      data: DIAS_MEDIDOS.map((dia, i) => ({
        lote_id: lote.id,
        usuario_id: admin.id,
        fecha: hace(28 - dia),
        alimento_kg: demo.alimento_kg[i],
        agua_litros: demo.alimento_kg[i] * 1.8,
        metodo_registro: 'manual',
      })),
    });

    await prisma.registroMortalidad.createMany({
      data: DIAS_MEDIDOS.map((dia, i) => ({
        lote_id: lote.id,
        usuario_id: admin.id,
        fecha: hace(28 - dia),
        cantidad_aves: demo.muertes[i],
        causa_presuntiva: 'sin determinar',
        metodo_registro: 'manual',
      })),
    });

    console.log(`Demo: lote ${demo.codigo} sembrado (id ${lote.id})`);
  }
}

async function main() {
  const rolAdmin = await sembrarRoles();
  await sembrarAdmin(rolAdmin.id);
  await sembrarCurvasObjetivo();
  await sembrarMatrizCalificacion();
  await sembrarPreguntasChatbot();
  await sembrarCategoriasFinancieras();
  await sembrarCatalogoSensores();
  await sembrarDatosDemo();
  console.log('Seed completado');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
