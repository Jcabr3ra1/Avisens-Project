import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CotizacionesService } from '../cotizaciones/cotizaciones.service';
import { InterpreteRespuestaService } from './interprete-respuesta.service';

import {
  A13_INTERNET,
  A16_MORTALIDAD,
  A20_DECIDE,
  DOLOR,
  NO_DECIDE,
  PUNTAJE_MAXIMO,
} from './dominio/calificacion';

describe('ChatbotService', () => {
  let service: ChatbotService;

  const prisma = {
    prospecto: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    preguntaChatbot: { findFirst: jest.fn(), count: jest.fn() },
    respuestaChatbot: { create: jest.fn(), aggregate: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    matrizCalificacion: { findUnique: jest.fn() },
    solicitudPqrs: { create: jest.fn() },
  };

  const cotizaciones = { generar: jest.fn() };

  const datosDe = (mock: jest.Mock, indice = 0) =>
    (mock.mock.calls as Array<[{ data: Record<string, unknown> }]>)[indice][0]
      .data;

  const ultimosDatos = (mock: jest.Mock) =>
    datosDe(mock, mock.mock.calls.length - 1);

  const pregunta = (extra: Record<string, unknown>) => ({
    id: 1,
    codigo: 'A1',
    bloque: 'A',
    texto: '¿Autorizas el tratamiento de tus datos?',
    tipo: 'si_no',
    opciones: ['Sí', 'No'],
    campo_prospecto: null,
    puntua: false,
    siguiente: 'A2',
    saltos: null,
    activa: true,
    ...extra,
  });

  const enCurso = {
    id: 7,
    sesion_id: '3f8a1c22-0b5e-4a71-9f3d-6c2b8e1d4a90',
    pregunta_actual: 'A1',
    consentimiento_habeas_data: true,
  };

  // Por defecto no interpreta: las pruebas de siempre siguen siendo
  // deterministas y no dependen de ningun modelo.
  const interprete = { interpretar: jest.fn().mockResolvedValue(null) };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.preguntaChatbot.count.mockResolvedValue(19);
    cotizaciones.generar.mockResolvedValue({
      codigo: 'COT-1-ABC',
      plan_recomendado: 'Profesional',
      numero_galpones: 2,
      valor_total_cop: 8000000,
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatbotService,
        { provide: PrismaService, useValue: prisma },
        { provide: CotizacionesService, useValue: cotizaciones },
        { provide: InterpreteRespuestaService, useValue: interprete },
      ],
    }).compile();
    service = module.get<ChatbotService>(ChatbotService);

    prisma.prospecto.findUnique.mockResolvedValue(enCurso);
    prisma.prospecto.update.mockResolvedValue(enCurso);
    prisma.respuestaChatbot.create.mockResolvedValue({});
    prisma.respuestaChatbot.findMany.mockResolvedValue([]);
    prisma.respuestaChatbot.count.mockResolvedValue(0);
    prisma.solicitudPqrs.create.mockResolvedValue({});
    prisma.preguntaChatbot.findFirst.mockResolvedValue(pregunta({}));
  });

  describe('iniciar', () => {
    it('crea el prospecto con un sesion_id UUID y arranca en el menu M1', async () => {
      prisma.prospecto.create.mockResolvedValue({ id: 1, sesion_id: 'uuid-x' });

      const r = await service.iniciar({});
      const datos = datosDe(prisma.prospecto.create);

      expect(datos.pregunta_actual).toBe('M1');
      expect(datos.estado).toBe('en_proceso');
      expect(datos.canal_origen).toBe('web');
      expect(datos.sesion_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(r.pregunta?.codigo).toBe('A1');
    });

    it('no expone los campos internos de la pregunta', async () => {
      prisma.prospecto.create.mockResolvedValue({ id: 1, sesion_id: 'uuid-x' });

      const r = await service.iniciar({ canal_origen: 'whatsapp' });

      expect(Object.keys(r.pregunta ?? {})).toEqual([
        'codigo',
        'texto',
        'tipo',
        'opciones',
      ]);
    });
  });

  describe('responder', () => {
    const responder = (respuesta: string) =>
      service.responder({ sesion_id: enCurso.sesion_id, respuesta });

    it('lanza NotFound cuando la sesion no existe', async () => {
      prisma.prospecto.findUnique.mockResolvedValue(null);
      await expect(responder('Sí')).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequest cuando la conversacion ya termino', async () => {
      prisma.prospecto.findUnique.mockResolvedValue({
        ...enCurso,
        pregunta_actual: 'FIN',
      });
      await expect(responder('Sí')).rejects.toThrow(/ya termino/);
    });

    it('rechaza una respuesta que no esta entre las opciones', async () => {
      await expect(responder('puede ser')).rejects.toThrow(
        /Respuesta no valida para A1/,
      );
      expect(prisma.respuestaChatbot.create).not.toHaveBeenCalled();
    });

    it('sigue el salto cuando la respuesta tiene uno definido', async () => {
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({ bloque: 'B', saltos: { No: 'FIN' } }),
      );
      prisma.respuestaChatbot.aggregate.mockResolvedValue({
        _sum: { puntaje_obtenido: 3 },
      });

      const r = await responder('No');

      expect(r.finalizado).toBe(true);
      expect(r.clasificacion).toBe('frio');
    });

    it('sigue el camino normal cuando la respuesta no tiene salto', async () => {
      const a2 = pregunta({ codigo: 'A2', tipo: 'texto_libre' });
      prisma.preguntaChatbot.findFirst
        .mockResolvedValueOnce(pregunta({ saltos: { No: 'FIN' } }))
        // primeraVisible consulta el candidato antes de servirlo
        .mockResolvedValueOnce(a2)
        .mockResolvedValueOnce(a2);

      const r = await responder('Sí');

      expect(datosDe(prisma.prospecto.update).pregunta_actual).toBe('A2');
      expect(r.pregunta?.codigo).toBe('A2');
    });

    it('convierte Si a booleano cuando la pregunta si_no va a una columna', async () => {
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({ campo_prospecto: 'consentimiento_habeas_data' }),
      );

      await responder('Sí');

      expect(datosDe(prisma.prospecto.update).consentimiento_habeas_data).toBe(
        true,
      );
    });

    it('guarda los numeros con coma decimal como numero', async () => {
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({
          codigo: 'A10',
          tipo: 'numero',
          opciones: null,
          campo_prospecto: 'area_galpon_m2',
          siguiente: 'A11',
        }),
      );

      await responder('1200,5');

      expect(datosDe(prisma.prospecto.update).area_galpon_m2).toBe(1200.5);
    });

    it('rechaza un numero negativo', async () => {
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({ codigo: 'A10', tipo: 'numero', opciones: null }),
      );
      await expect(responder('-5')).rejects.toThrow(BadRequestException);
    });

    it('busca el puntaje en la matriz cuando la pregunta puntua', async () => {
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({
          codigo: 'A8',
          tipo: 'opcion_unica',
          opciones: ['>10000', '<1000'],
          puntua: true,
          siguiente: 'A9',
        }),
      );
      prisma.matrizCalificacion.findUnique.mockResolvedValue({ puntaje: 4 });

      await responder('>10000');

      expect(datosDe(prisma.respuestaChatbot.create).puntaje_obtenido).toBe(4);
    });

    it('da 0 cuando la opcion no esta en la matriz', async () => {
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({
          codigo: 'A9',
          tipo: 'opcion_unica',
          opciones: ['Sí, está construido', 'No, aun no lo construyo'],
          puntua: true,
          siguiente: 'A10',
        }),
      );
      prisma.matrizCalificacion.findUnique.mockResolvedValue(null);

      await responder('No, aun no lo construyo');

      expect(datosDe(prisma.respuestaChatbot.create).puntaje_obtenido).toBe(0);
    });
  });

  describe('clasificacion al finalizar', () => {
    const finalizarCon = async (puntos: number | null) => {
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({ bloque: 'B', siguiente: 'FIN' }),
      );
      prisma.respuestaChatbot.aggregate.mockResolvedValue({
        _sum: { puntaje_obtenido: puntos },
      });
      return service.responder({
        sesion_id: enCurso.sesion_id,
        respuesta: 'Sí',
      });
    };

    // Los umbrales son 8 y 5 sobre los 12 puntos comerciales. Antes eran 12 y
    // 7 sobre 16, que son las mismas proporciones.
    it.each([
      [12, 'caliente'],
      [8, 'caliente'],
      [7, 'tibio'],
      [5, 'tibio'],
      [4, 'frio'],
      [0, 'frio'],
    ])('con %i puntos clasifica como %s', async (puntos, esperada) => {
      const r = await finalizarCon(puntos);
      expect(r.puntaje_total).toBe(puntos);
      expect(r.clasificacion).toBe(esperada);
    });

    it('trata la suma nula como cero y no como null', async () => {
      const r = await finalizarCon(null);
      expect(r.puntaje_total).toBe(0);
      expect(r.clasificacion).toBe('frio');
    });

    it('marca el prospecto como calificado y cierra el flujo', async () => {
      await finalizarCon(14);
      const datos = ultimosDatos(prisma.prospecto.update);
      expect(datos.estado).toBe('calificado');
      expect(datos.pregunta_actual).toBe('FIN');
      expect(datos.asesor_asignado_id).toBeUndefined();
    });
  });
  describe('interpretacion de la respuesta', () => {
    const responder = (respuesta: string) =>
      service.responder({ sesion_id: enCurso.sesion_id, respuesta });

    it('acepta el numero de la opcion, que es como se listan por WhatsApp', async () => {
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({
          codigo: 'A8',
          tipo: 'opcion_unica',
          opciones: ['<1000', '5000-10000'],
          puntua: true,
          siguiente: 'A9',
        }),
      );
      prisma.matrizCalificacion.findUnique.mockResolvedValue({ puntaje: 3 });

      await responder('2');

      expect(datosDe(prisma.respuestaChatbot.create).respuesta_texto).toBe(
        '5000-10000',
      );
      expect(prisma.matrizCalificacion.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            codigo_pregunta_opcion_respuesta: {
              codigo_pregunta: 'A8',
              opcion_respuesta: '5000-10000',
            },
          },
        }),
      );
    });

    it('acepta la opcion escrita sin tildes ni mayusculas', async () => {
      await responder('si');

      expect(datosDe(prisma.respuestaChatbot.create).respuesta_texto).toBe('Sí');
    });

    it('sigue el salto usando la opcion resuelta, no lo que tecleo el usuario', async () => {
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({ bloque: 'B', saltos: { No: 'FIN' } }),
      );
      prisma.respuestaChatbot.aggregate.mockResolvedValue({
        _sum: { puntaje_obtenido: null },
      });

      const r = await responder('2');

      expect(r.finalizado).toBe(true);
    });

    it('rechaza lo que no corresponde a ninguna opcion', async () => {
      await expect(responder('tal vez')).rejects.toThrow(
        /Respuesta no valida para A1/,
      );
      expect(prisma.respuestaChatbot.create).not.toHaveBeenCalled();
    });

    it('un numero fuera de rango no se toma como indice', async () => {
      await expect(responder('7')).rejects.toThrow(
        /Respuesta no valida para A1/,
      );
    });
  });

  describe('preguntas omitidas por canal', () => {
    it('no omite una pregunta que no declara canal', async () => {
      prisma.prospecto.create.mockResolvedValue({ id: 1, sesion_id: 'u' });
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({ omitir_si_canal: null }),
      );

      const r = await service.iniciar({ canal_origen: 'whatsapp' });

      expect(r.pregunta?.codigo).toBe('A1');
    });

    it('salta la pregunta cuando el canal coincide', async () => {
      prisma.prospecto.create.mockResolvedValue({ id: 1, sesion_id: 'u' });
      const a4 = pregunta({
        codigo: 'A4',
        omitir_si_canal: 'whatsapp',
        siguiente: 'A5',
      });
      const a5 = pregunta({ codigo: 'A5', omitir_si_canal: null });
      prisma.preguntaChatbot.findFirst
        .mockResolvedValueOnce(a4)
        .mockResolvedValueOnce(a5)
        .mockResolvedValueOnce(a5);

      const r = await service.iniciar({ canal_origen: 'whatsapp' });

      expect(r.pregunta?.codigo).toBe('A5');
      expect(datosDe(prisma.prospecto.create).pregunta_actual).toBe('A5');
    });

    it('no salta esa misma pregunta en otro canal', async () => {
      prisma.prospecto.create.mockResolvedValue({ id: 1, sesion_id: 'u' });
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({ codigo: 'A4', omitir_si_canal: 'whatsapp' }),
      );

      const r = await service.iniciar({ canal_origen: 'web' });

      expect(r.pregunta?.codigo).toBe('A4');
    });

    it('no guarda en el prospecto una respuesta vacia', async () => {
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({
          codigo: 'A4',
          tipo: 'texto_libre',
          opciones: null,
          campo_prospecto: 'telefono',
          omitir_si_canal: null,
        }),
      );
      await service.responder({
        sesion_id: enCurso.sesion_id,
        respuesta: '   ',
      });

      const datos = datosDe(prisma.prospecto.update);
      expect(datos.telefono).toBeUndefined();
      expect(datos.pregunta_actual).toBeDefined();
    });
  });
  describe('sin consentimiento de habeas data', () => {
    it('no clasifica como frio a quien no autorizo sus datos', async () => {
      prisma.prospecto.findUnique.mockResolvedValue({
        ...enCurso,
        consentimiento_habeas_data: false,
      });
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({ bloque: 'B', saltos: { No: 'FIN' } }),
      );
      prisma.respuestaChatbot.aggregate.mockResolvedValue({
        _sum: { puntaje_obtenido: null },
      });

      const r = await service.responder({
        sesion_id: enCurso.sesion_id,
        respuesta: 'No',
      });

      expect(r.finalizado).toBe(true);
      expect(r.clasificacion).toBe('sin_consentimiento');
      expect(r.puntaje_total).toBeNull();

      const datos = ultimosDatos(prisma.prospecto.update);
      expect(datos.estado).toBe('sin_consentimiento');
      expect(datos.puntaje_total).toBeUndefined();
    });

    it('clasifica normalmente a quien si autorizo', async () => {
      prisma.prospecto.findUnique.mockResolvedValue(enCurso);
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({ bloque: 'B', siguiente: 'FIN' }),
      );
      prisma.respuestaChatbot.aggregate.mockResolvedValue({
        _sum: { puntaje_obtenido: 14 },
      });

      const r = await service.responder({
        sesion_id: enCurso.sesion_id,
        respuesta: 'Sí',
      });

      expect(r.clasificacion).toBe('caliente');
      expect(ultimosDatos(prisma.prospecto.update).estado).toBe('calificado');
    });
  });

  describe('rutas: cotizacion (bloque A) vs general (bloque B)', () => {
    it('por defecto arranca en la ruta de cotizacion (A1)', async () => {
      prisma.prospecto.create.mockResolvedValue({ id: 1, sesion_id: 'u' });
      prisma.preguntaChatbot.findFirst.mockResolvedValue(pregunta({}));

      const r = await service.iniciar({});

      expect(r.pregunta?.codigo).toBe('A1');
    });

    it('con ruta general arranca en B1 (PQRS)', async () => {
      prisma.prospecto.create.mockResolvedValue({ id: 1, sesion_id: 'u' });
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({ codigo: 'B1', bloque: 'B', tipo: 'opcion_unica' }),
      );

      const r = await service.iniciar({ ruta: 'general' });

      expect(r.pregunta?.codigo).toBe('B1');
      expect(datosDe(prisma.prospecto.create).pregunta_actual).toBe('B1');
    });

    it('cierra el bloque B como consulta atendida, sin radicar ni puntuar', async () => {
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({
          codigo: 'B3',
          bloque: 'B',
          tipo: 'texto_libre',
          siguiente: 'FIN',
        }),
      );
      prisma.respuestaChatbot.aggregate.mockResolvedValue({
        _sum: { puntaje_obtenido: null },
      });
      prisma.respuestaChatbot.findMany.mockResolvedValue([
        { bloque: 'B', codigo_pregunta: 'B1', respuesta_texto: 'Sugerencia' },
        { bloque: 'B', codigo_pregunta: 'B2', respuesta_texto: 'Los sensores' },
        { bloque: 'B', codigo_pregunta: 'B3', respuesta_texto: 'Detalle largo' },
      ]);

      const r = await service.responder({
        sesion_id: enCurso.sesion_id,
        respuesta: 'Detalle largo',
      });

      expect(r.finalizado).toBe(true);
      expect(r.clasificacion).toBe('consulta_atendida');
      expect(r.puntaje_total).toBeNull();
      // Ya no se radica nada: el bloque B quedo reducido a preguntas
      // frecuentes de preventa, sin soporte posventa.
      expect(prisma.solicitudPqrs.create).not.toHaveBeenCalled();
    });

    it('la ruta de cotizacion no radica PQRS', async () => {
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({ bloque: 'B', siguiente: 'FIN' }),
      );
      prisma.respuestaChatbot.aggregate.mockResolvedValue({
        _sum: { puntaje_obtenido: 12 },
      });
      prisma.respuestaChatbot.findMany.mockResolvedValue([
        { bloque: 'A', codigo_pregunta: 'A8', respuesta_texto: '>10000' },
      ]);

      await service.responder({ sesion_id: enCurso.sesion_id, respuesta: 'Sí' });

      expect(prisma.solicitudPqrs.create).not.toHaveBeenCalled();
    });
  });

  describe('reglas de negocio de la especificacion', () => {
    const cerrarCon = async (
      respuestas: Array<{ bloque: string; codigo_pregunta: string; respuesta_texto: string }>,
      puntaje: number,
    ) => {
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({ bloque: 'B', siguiente: 'FIN' }),
      );
      prisma.respuestaChatbot.aggregate.mockResolvedValue({
        _sum: { puntaje_obtenido: puntaje },
      });
      prisma.respuestaChatbot.findMany.mockResolvedValue(respuestas);

      await service.responder({
        sesion_id: enCurso.sesion_id,
        respuesta: 'Sí',
      });

      return ultimosDatos(prisma.prospecto.update);
    };

    const A = (codigo: string, texto: string) => ({
      bloque: 'A',
      codigo_pregunta: codigo,
      respuesta_texto: texto,
    });

    it('un lead caliente se enruta a visita presencial', async () => {
      const datos = await cerrarCon([A('A20', A20_DECIDE[0].texto)], PUNTAJE_MAXIMO);
      expect(datos.clasificacion).toBe('caliente');
      expect(datos.accion_siguiente).toBe('VISITA_PRESENCIAL');
    });

    it('un lead tibio se enruta a demostracion remota', async () => {
      const datos = await cerrarCon([A('A20', A20_DECIDE[0].texto)], 6);
      expect(datos.clasificacion).toBe('tibio');
      expect(datos.accion_siguiente).toBe('DEMO_REMOTA');
    });

    it('un lead frio se enruta a seguimiento automatizado', async () => {
      const datos = await cerrarCon([A('A20', 'Sí')], 4);
      expect(datos.clasificacion).toBe('frio');
      expect(datos.accion_siguiente).toBe('SEGUIMIENTO_AUTOMATIZADO');
    });

    it('sin poder de decision prima el callback sobre el puntaje', async () => {
      const datos = await cerrarCon([A('A20', NO_DECIDE)], PUNTAJE_MAXIMO);

      expect(datos.clasificacion).toBe('caliente');
      expect(datos.accion_siguiente).toBe('CALLBACK_DECISOR');
      expect(datos.fecha_callback).toBeInstanceOf(Date);
    });

    it('el callback queda programado a 48 horas', async () => {
      const antes = Date.now();
      const datos = await cerrarCon([A('A20', NO_DECIDE)], 5);

      const fecha = datos.fecha_callback as Date;
      const horas = (fecha.getTime() - antes) / 3600000;
      expect(horas).toBeGreaterThan(47.9);
      expect(horas).toBeLessThan(48.1);
    });

    it('quien si decide no queda con callback programado', async () => {
      const datos = await cerrarCon([A('A20', 'Sí')], 5);
      expect(datos.fecha_callback).toBeUndefined();
    });

    it('la zona rural sin senal se registra sin descartar al prospecto', async () => {
      const datos = await cerrarCon(
        [A('A20', A20_DECIDE[0].texto), A('A13', A13_INTERNET.SIN_SENAL)],
        13,
      );

      expect(datos.conectividad_limitada).toBe(true);
      expect(datos.clasificacion).toBe('caliente');
      expect(datos.accion_siguiente).toBe('VISITA_PRESENCIAL');
    });

    it('la conectividad estable no marca la condicion', async () => {
      const datos = await cerrarCon(
        [A('A20', 'Sí'), A('A13', 'Sí, estable')],
        13,
      );
      expect(datos.conectividad_limitada).toBe(false);
    });

    it('la mortalidad ambiental repetida marca senal caliente', async () => {
      const datos = await cerrarCon(
        [A('A20', A20_DECIDE[0].texto), A('A16', DOLOR[0])],
        8,
      );
      expect(datos.senal_caliente).toBe(true);
    });

    it('una problematica descrita en texto libre tambien marca senal caliente', async () => {
      const datos = await cerrarCon(
        [
          A('A20', A20_DECIDE[0].texto),
          A('A16', A16_MORTALIDAD[2].texto),
          A('A14', 'Mortalidad por calor o frío'),
        ],
        8,
      );
      expect(datos.senal_caliente).toBe(true);
    });

    it('sin dolor declarado no se marca senal caliente', async () => {
      const datos = await cerrarCon(
        [A('A20', 'Sí'), A('A16', 'No'), A('A14', '   ')],
        8,
      );
      expect(datos.senal_caliente).toBe(false);
    });
  });

  describe('bloque B: consultas frecuentes y radicacion', () => {
    const cerrarB = async (respuestas: Array<[string, string]>) => {
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({ codigo: 'BP1', bloque: 'B', siguiente: 'FIN' }),
      );
      prisma.respuestaChatbot.aggregate.mockResolvedValue({
        _sum: { puntaje_obtenido: null },
      });
      prisma.respuestaChatbot.findMany.mockResolvedValue(
        respuestas.map(([codigo, texto]) => ({
          bloque: 'B',
          codigo_pregunta: codigo,
          respuesta_texto: texto,
        })),
      );

      await service.responder({
        sesion_id: enCurso.sesion_id,
        respuesta: 'Sí',
      });
    };

    it('una consulta atendida no genera ticket', async () => {
      await cerrarB([['B1', 'Petición']]);

      expect(prisma.solicitudPqrs.create).not.toHaveBeenCalled();
      expect(ultimosDatos(prisma.prospecto.update).estado).toBe(
        'consulta_atendida',
      );
    });


    it('no puntua ni clasifica comercialmente una consulta', async () => {
      await cerrarB([['B1', 'Queja'], ['B2', 'x'], ['B3', 'y']]);

      const datos = ultimosDatos(prisma.prospecto.update);
      expect(datos.puntaje_total).toBeUndefined();
      expect(datos.accion_siguiente).toBeUndefined();
    });
  });

  describe('cotizacion automatica al cerrar', () => {
    const cerrar = async (respuestas: Array<[string, string]>, puntaje = 13) => {
      // El flujo pasa por la pantalla de confirmacion antes de cerrar.
      prisma.prospecto.findUnique.mockResolvedValue({
        ...enCurso,
        pregunta_actual: 'CONFIRMAR',
      });
      prisma.respuestaChatbot.aggregate.mockResolvedValue({
        _sum: { puntaje_obtenido: puntaje },
      });
      prisma.respuestaChatbot.findMany.mockResolvedValue(
        respuestas.map(([codigo, texto]) => ({
          bloque: 'A',
          codigo_pregunta: codigo,
          respuesta_texto: texto,
        })),
      );

      return (await service.responder({
        sesion_id: enCurso.sesion_id,
        respuesta: 'Sí',
      })) as {
        finalizado: boolean;
        clasificacion: string | null;
        cotizacion: { codigo: string } | null;
      };
    };

    it('la genera sola cuando el prospecto queda calificado', async () => {
      const r = await cerrar([['A20', 'Sí']]);

      expect(cotizaciones.generar).toHaveBeenCalledWith(enCurso.id, {});
      expect(r.cotizacion).toEqual(
        expect.objectContaining({ codigo: 'COT-1-ABC' }),
      );
    });

    it('no la genera para quien queda en callback: no se le prometio', async () => {
      const r = await cerrar([['A20', NO_DECIDE]]);

      expect(cotizaciones.generar).not.toHaveBeenCalled();
      expect(r.cotizacion).toBeNull();
    });

    it('un fallo al cotizar no tumba el cierre de la conversacion', async () => {
      cotizaciones.generar.mockRejectedValue(new Error('catalogo vacio'));

      const r = await cerrar([['A20', 'Sí']]);

      expect(r.finalizado).toBe(true);
      expect(r.clasificacion).toBe('caliente');
      expect(r.cotizacion).toBeNull();
    });
  });

  describe('rangos de area', () => {
    const responderRango = async (opciones: string[], respuesta: string) => {
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({
          codigo: 'A5',
          tipo: 'opcion_unica',
          opciones,
          campo_prospecto: 'area_granja_m2',
          siguiente: 'A6',
        }),
      );

      await service.responder({
        sesion_id: enCurso.sesion_id,
        respuesta,
      });

      return datosDe(prisma.prospecto.update).area_granja_m2;
    };

    it('guarda el punto medio del rango elegido', async () => {
      const valor = await responderRango(
        ['Menos de 500 m²', '500 - 2.000 m²'],
        '500 - 2.000 m²',
      );
      expect(valor).toBe(1250);
    });

    it('respeta los separadores de miles', async () => {
      const valor = await responderRango(
        ['2.000 - 10.000 m²', 'Otro, lo escribo'],
        '2.000 - 10.000 m²',
      );
      expect(valor).toBe(6000);
    });

    it('usa el unico numero cuando el rango es abierto', async () => {
      const valor = await responderRango(
        ['Menos de 500 m²', 'Más de 10.000 m²'],
        'Menos de 500 m²',
      );
      expect(valor).toBe(500);
    });

    it('no convierte cuando el usuario escribe el numero a mano', async () => {
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({
          codigo: 'A5B',
          tipo: 'numero',
          opciones: null,
          campo_prospecto: 'area_granja_m2',
          siguiente: 'A6',
        }),
      );

      await service.responder({
        sesion_id: enCurso.sesion_id,
        respuesta: '1200,5',
      });

      expect(datosDe(prisma.prospecto.update).area_granja_m2).toBe(1200.5);
    });
  });

  describe('correccion selectiva de datos', () => {
    const enConfirmar = { ...enCurso, pregunta_actual: 'CONFIRMAR' };

    it('ofrece elegir el dato en vez de rehacer el cuestionario', async () => {
      prisma.prospecto.findUnique.mockResolvedValue(enConfirmar);

      const r = await service.responder({
        sesion_id: enCurso.sesion_id,
        respuesta: 'No, corregir datos',
      });

      expect(r.pregunta?.codigo).toBe('CORREGIR');
      expect(r.pregunta?.opciones).toContain('Teléfono');
      expect(ultimosDatos(prisma.prospecto.update).pregunta_actual).toBe(
        'CORREGIR',
      );
    });

    it('lleva a la pregunta del dato elegido, marcada como correccion', async () => {
      prisma.prospecto.findUnique.mockResolvedValue({
        ...enCurso,
        pregunta_actual: 'CORREGIR',
      });
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({ codigo: 'C1', tipo: 'texto_libre', opciones: null }),
      );

      await service.responder({
        sesion_id: enCurso.sesion_id,
        respuesta: 'Teléfono',
      });

      expect(ultimosDatos(prisma.prospecto.update).pregunta_actual).toBe(
        'FIX:C1',
      );
    });

    it('rechaza un dato que no esta en la lista', async () => {
      prisma.prospecto.findUnique.mockResolvedValue({
        ...enCurso,
        pregunta_actual: 'CORREGIR',
      });

      await expect(
        service.responder({
          sesion_id: enCurso.sesion_id,
          respuesta: 'lo que sea',
        }),
      ).rejects.toThrow(/Elige uno de los datos/);
    });

    it('tras corregir vuelve al resumen y no sigue el cuestionario', async () => {
      prisma.prospecto.findUnique.mockResolvedValue({
        ...enCurso,
        pregunta_actual: 'FIX:A4',
      });
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({
          codigo: 'A4',
          tipo: 'texto_libre',
          opciones: null,
          campo_prospecto: 'municipio',
          siguiente: 'A5',
        }),
      );

      const r = await service.responder({
        sesion_id: enCurso.sesion_id,
        respuesta: 'Piendamo',
      });

      expect(r.pregunta?.codigo).toBe('CONFIRMAR');
      const datos = ultimosDatos(prisma.prospecto.update);
      expect(datos.pregunta_actual).toBe('CONFIRMAR');
      expect(datos.municipio).toBe('Piendamo');
    });
  });

  describe('respuestas en lenguaje natural', () => {
    const conOpciones = () =>
      prisma.preguntaChatbot.findFirst.mockResolvedValue(
        pregunta({
          codigo: 'A11',
          texto: '¿Cómo es la energía en tu granja?',
          tipo: 'opcion_unica',
          opciones: ['Estable todo el día', 'Se va, pero tengo planta'],
          siguiente: 'A13',
        }),
      );

    it('no llama al modelo si la persona escribio el numero de la opcion', async () => {
      conOpciones();

      await service.responder({ sesion_id: enCurso.sesion_id, respuesta: '1' });

      expect(interprete.interpretar).not.toHaveBeenCalled();
      expect(datosDe(prisma.respuestaChatbot.create).respuesta_texto).toBe(
        'Estable todo el día',
      );
    });

    it('no llama al modelo si escribio el texto exacto', async () => {
      conOpciones();

      await service.responder({
        sesion_id: enCurso.sesion_id,
        respuesta: 'Se va, pero tengo planta',
      });

      expect(interprete.interpretar).not.toHaveBeenCalled();
    });

    it('interpreta una respuesta escrita a mano y guarda la opcion', async () => {
      conOpciones();
      interprete.interpretar.mockResolvedValueOnce('Se va, pero tengo planta');

      await service.responder({
        sesion_id: enCurso.sesion_id,
        respuesta: 'se me va la luz a cada rato pero tengo plantica',
      });

      expect(interprete.interpretar).toHaveBeenCalled();
      expect(datosDe(prisma.respuestaChatbot.create).respuesta_texto).toBe(
        'Se va, pero tengo planta',
      );
    });

    it('si el modelo no entiende, se comporta como antes de existir', async () => {
      // Sin API key, con error o con una respuesta que no encaja, el flujo
      // sigue siendo el determinista: la respuesta se rechaza como siempre.
      conOpciones();
      interprete.interpretar.mockResolvedValueOnce(null);

      await expect(
        service.responder({
          sesion_id: enCurso.sesion_id,
          respuesta: 'cualquier cosa que no encaja',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
