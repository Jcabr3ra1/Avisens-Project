import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ChatbotService', () => {
  let service: ChatbotService;

  const prisma = {
    prospecto: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    preguntaChatbot: { findFirst: jest.fn() },
    respuestaChatbot: { create: jest.fn(), aggregate: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    matrizCalificacion: { findUnique: jest.fn() },
    solicitudPqrs: { create: jest.fn() },
  };

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

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatbotService,
        { provide: PrismaService, useValue: prisma },
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

    it.each([
      [16, 'caliente'],
      [12, 'caliente'],
      [11, 'tibio'],
      [7, 'tibio'],
      [6, 'frio'],
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

    it('radica una SolicitudPqrs al terminar el bloque B, sin puntaje comercial', async () => {
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
      expect(r.clasificacion).toBe('pqrs');
      expect(r.puntaje_total).toBeNull();
      expect(prisma.solicitudPqrs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            categoria: 'Sugerencia',
            asunto: 'Los sensores',
            mensaje: 'Detalle largo',
            estado: 'abierta',
          }),
        }),
      );
      expect(ultimosDatos(prisma.prospecto.update).estado).toBe('pqrs');
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
      const datos = await cerrarCon([A('A20', 'Sí')], 14);
      expect(datos.clasificacion).toBe('caliente');
      expect(datos.accion_siguiente).toBe('VISITA_PRESENCIAL');
    });

    it('un lead tibio se enruta a demostracion remota', async () => {
      const datos = await cerrarCon([A('A20', 'Sí')], 9);
      expect(datos.clasificacion).toBe('tibio');
      expect(datos.accion_siguiente).toBe('DEMO_REMOTA');
    });

    it('un lead frio se enruta a seguimiento automatizado', async () => {
      const datos = await cerrarCon([A('A20', 'Sí')], 4);
      expect(datos.clasificacion).toBe('frio');
      expect(datos.accion_siguiente).toBe('SEGUIMIENTO_AUTOMATIZADO');
    });

    it('sin poder de decision prima el callback sobre el puntaje', async () => {
      const datos = await cerrarCon([A('A20', 'No')], 15);

      expect(datos.clasificacion).toBe('caliente');
      expect(datos.accion_siguiente).toBe('CALLBACK_DECISOR');
      expect(datos.fecha_callback).toBeInstanceOf(Date);
    });

    it('el callback queda programado a 48 horas', async () => {
      const antes = Date.now();
      const datos = await cerrarCon([A('A20', 'No')], 5);

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
        [A('A20', 'Sí'), A('A13', 'No, zona rural sin señal')],
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
        [A('A20', 'Sí'), A('A16', 'Sí, más de una vez')],
        8,
      );
      expect(datos.senal_caliente).toBe(true);
    });

    it('una problematica descrita en texto libre tambien marca senal caliente', async () => {
      const datos = await cerrarCon(
        [A('A20', 'Sí'), A('A16', 'No'), A('A14', 'Se me mueren por calor')],
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

    it('radica solo cuando la persona pidio registrar el caso', async () => {
      await cerrarB([
        ['B1', 'Reclamo'],
        ['B2', 'Sensores sin datos'],
        ['B3', 'Llevan dos dias sin reportar'],
      ]);

      expect(prisma.solicitudPqrs.create).toHaveBeenCalled();
      const datos = datosDe(prisma.solicitudPqrs.create);
      expect(datos.categoria).toBe('Reclamo');
      expect(datos.asunto).toBe('Sensores sin datos');
      expect(datos.estado).toBe('abierta');
      expect(ultimosDatos(prisma.prospecto.update).estado).toBe('pqrs');
    });

    it('no puntua ni clasifica comercialmente una consulta', async () => {
      await cerrarB([['B1', 'Queja'], ['B2', 'x'], ['B3', 'y']]);

      const datos = ultimosDatos(prisma.prospecto.update);
      expect(datos.puntaje_total).toBeUndefined();
      expect(datos.accion_siguiente).toBeUndefined();
    });
  });
});
