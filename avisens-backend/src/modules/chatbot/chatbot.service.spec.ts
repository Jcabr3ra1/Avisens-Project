import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ChatbotService', () => {
  let service: ChatbotService;

  const prisma = {
    prospecto: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    preguntaChatbot: { findFirst: jest.fn() },
    respuestaChatbot: { create: jest.fn(), aggregate: jest.fn() },
    matrizCalificacion: { findUnique: jest.fn() },
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
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatbotService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<ChatbotService>(ChatbotService);

    prisma.prospecto.findUnique.mockResolvedValue(enCurso);
    prisma.prospecto.update.mockResolvedValue(enCurso);
    prisma.respuestaChatbot.create.mockResolvedValue({});
    prisma.preguntaChatbot.findFirst.mockResolvedValue(pregunta({}));
  });

  describe('iniciar', () => {
    it('crea el prospecto con un sesion_id UUID y arranca en A1', async () => {
      prisma.prospecto.create.mockResolvedValue({ id: 1, sesion_id: 'uuid-x' });

      const r = await service.iniciar({});
      const datos = datosDe(prisma.prospecto.create);

      expect(datos.pregunta_actual).toBe('A1');
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
        pregunta({ saltos: { No: 'FIN' } }),
      );
      prisma.respuestaChatbot.aggregate.mockResolvedValue({
        _sum: { puntaje_obtenido: 3 },
      });

      const r = await responder('No');

      expect(r.finalizado).toBe(true);
      expect(r.clasificacion).toBe('frio');
    });

    it('sigue el camino normal cuando la respuesta no tiene salto', async () => {
      prisma.preguntaChatbot.findFirst
        .mockResolvedValueOnce(pregunta({ saltos: { No: 'FIN' } }))
        .mockResolvedValueOnce(pregunta({ codigo: 'A2', tipo: 'texto_libre' }));

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
        pregunta({ siguiente: 'FIN' }),
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
});
