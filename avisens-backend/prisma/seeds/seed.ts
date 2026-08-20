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
    codigo: 'A1',
    bloque: 'A',
    orden: 1,
    texto: '¿Autorizas el tratamiento de tus datos personales (habeas data)?',
    tipo: 'si_no',
    opciones: ['Sí', 'No'],
    campo_prospecto: 'consentimiento_habeas_data',
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A2',
    saltos: { No: 'FIN' },
  },
  {
    codigo: 'A2',
    bloque: 'A',
    orden: 2,
    texto: '¿Cual es tu nombre completo?',
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
    texto: '¿Cual es tu numero de documento?',
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
    texto: '¿A que numero de telefono te podemos contactar?',
    tipo: 'texto_libre',
    opciones: null,
    campo_prospecto: 'telefono',
    puntua: false,
    // Por WhatsApp el numero ya llega en el webhook: no se pregunta.
    omitir_si_canal: 'whatsapp',
    siguiente: 'A5',
    saltos: null,
  },
  {
    codigo: 'A5',
    bloque: 'A',
    orden: 5,
    texto: '¿Cual es tu correo electronico?',
    tipo: 'texto_libre',
    opciones: null,
    campo_prospecto: 'email',
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A6',
    saltos: null,
  },
  {
    codigo: 'A6',
    bloque: 'A',
    orden: 6,
    texto: '¿Como se llama tu granja?',
    tipo: 'texto_libre',
    opciones: null,
    campo_prospecto: 'nombre_granja',
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A7',
    saltos: null,
  },
  {
    codigo: 'A7',
    bloque: 'A',
    orden: 7,
    texto: '¿En que municipio esta ubicada?',
    tipo: 'texto_libre',
    opciones: null,
    campo_prospecto: 'municipio',
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A8',
    saltos: null,
  },
  {
    codigo: 'A8',
    bloque: 'A',
    orden: 8,
    texto: '¿Cuantas aves manejas por ciclo?',
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
    texto: '¿Ya tienes el galpon construido?',
    tipo: 'opcion_unica',
    opciones: [
      'Sí, está construido y se encuentra en buenas condiciones',
      'Sí, pero necesita adecuaciones',
      'No, aun no lo construyo',
    ],
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
    texto: '¿Cuantos metros cuadrados tiene el galpon?',
    tipo: 'numero',
    opciones: null,
    campo_prospecto: 'area_galpon_m2',
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A11',
    saltos: null,
  },
  {
    codigo: 'A11',
    bloque: 'A',
    orden: 11,
    texto: '¿Que tipo de suministro electrico tienes en la granja?',
    tipo: 'opcion_unica',
    opciones: [
      'Eléctrico estable',
      'Eléctrico con cortes frecuentes',
      'Planta electrica',
      'No tengo energia en el galpon',
    ],
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
    texto: '¿Cuantos metros cuadrados tiene la granja en total?',
    tipo: 'numero',
    opciones: null,
    campo_prospecto: 'area_granja_m2',
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A13',
    saltos: null,
  },
  {
    codigo: 'A13',
    bloque: 'A',
    orden: 13,
    texto: '¿Tienes conexion a internet en la granja?',
    tipo: 'opcion_unica',
    opciones: ['Sí, estable', 'Sí, pero intermitente', 'No'],
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
    texto: '¿Cual es tu rol en la granja?',
    tipo: 'opcion_unica',
    opciones: ['Propietario', 'Administrador', 'Galponero', 'Otro'],
    campo_prospecto: 'rol_prospecto',
    omitir_si_canal: null,
    puntua: false,
    siguiente: 'A15',
    saltos: null,
  },
  {
    codigo: 'A15',
    bloque: 'A',
    orden: 15,
    texto: '¿Que tipo de produccion manejas?',
    tipo: 'opcion_unica',
    opciones: ['Pollo de engorde', 'Ponedoras', 'Ambas'],
    campo_prospecto: 'tipo_produccion',
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
      '¿Has perdido aves por problemas de temperatura, humedad o ventilacion?',
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
    texto: '¿Eres tu quien decide las compras de la granja?',
    tipo: 'si_no',
    opciones: ['Sí', 'No'],
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
    texto: '¿Como preferirias adquirir el sistema?',
    tipo: 'opcion_unica',
    opciones: [
      'Compra directa',
      'Suscripción',
      'Lo que sea más conveniente',
      'No sé',
    ],
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
    texto: '¿Has mirado otras opciones en el mercado?',
    tipo: 'opcion_unica',
    opciones: [
      'Sí, ya tengo cotizaciones',
      'Estoy mirando opciones',
      'Solo AVISENS',
      'No sé qué más existe',
    ],
    campo_prospecto: null,
    omitir_si_canal: null,
    puntua: true,
    siguiente: 'FIN',
    saltos: null,
  },

  {
    codigo: 'B1',
    bloque: 'B',
    orden: 1,
    texto: '¿Que tipo de solicitud quieres radicar?',
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
    texto: '¿Cual es el asunto?',
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
    texto: 'Cuentanos con detalle que sucedio',
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

async function main() {
  const rolAdmin = await sembrarRoles();
  await sembrarAdmin(rolAdmin.id);
  await sembrarCurvasObjetivo();
  await sembrarMatrizCalificacion();
  await sembrarMatrizCalificacion();
  await sembrarPreguntasChatbot();
  await sembrarCategoriasFinancieras();
  await sembrarPreguntasChatbot();
  await sembrarCatalogoSensores();
  console.log('Seed completado');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
