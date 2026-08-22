import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { WhatsappService } from './whatsapp.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatbotService } from '../chatbot/chatbot.service';
import { COLA_WHATSAPP } from './whatsapp.tipos';

describe('WhatsappService', () => {
  let service: WhatsappService;

  const cola = { add: jest.fn() };
  const prisma = {
    prospecto: { findFirst: jest.fn(), update: jest.fn() },
  };
  const chatbot = { iniciar: jest.fn(), responder: jest.fn() };

  const argsDe = (mock: jest.Mock, indice = 0) =>
    mock.mock.calls[indice] as unknown[];

  const webhook = (mensajes: unknown[]) => ({
    object: 'whatsapp_business_account',
    entry: [{ id: '1', changes: [{ value: { messages: mensajes } }] }],
  });

  const texto = (id: string, cuerpo: string) => ({
    id,
    from: '573001112233',
    type: 'text',
    text: { body: cuerpo },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        { provide: getQueueToken(COLA_WHATSAPP), useValue: cola },
        { provide: PrismaService, useValue: prisma },
        { provide: ChatbotService, useValue: chatbot },
      ],
    }).compile();
    service = module.get<WhatsappService>(WhatsappService);
  });

  describe('encolarEntrantes', () => {
    it('descarta el mensaje sin remitente en vez de encolarlo', async () => {
      const sinFrom = {
        id: 'wamid.SIN_FROM',
        type: 'text',
        text: { body: 'Hola' },
      };

      await service.encolarEntrantes(webhook([sinFrom]));

      expect(cola.add).not.toHaveBeenCalled();
    });

    it('usa from_user_id cuando el remitente oculta su telefono con nombre de usuario', async () => {
      await service.encolarEntrantes({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '1',
            changes: [
              {
                value: {
                  contacts: [
                    {
                      profile: { name: 'Juan Jaller', username: 'Jjall3r' },
                      user_id: 'CO.1639897497563370',
                    },
                  ],
                  messages: [
                    {
                      from_user_id: 'CO.1639897497563370',
                      id: 'wamid.USERNAME',
                      type: 'text',
                      text: { body: 'Hola' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      });

      const [, datos] = argsDe(cola.add) as [string, { de: string }];
      expect(datos.de).toBe('CO.1639897497563370');
    });

    it('cae al user_id del contacto si el mensaje no trae ningun remitente', async () => {
      await service.encolarEntrantes({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '1',
            changes: [
              {
                value: {
                  contacts: [{ user_id: 'CO.877155788811553' }],
                  messages: [
                    {
                      id: 'wamid.SOLO_CONTACTO',
                      type: 'text',
                      text: { body: 'Hola' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      });

      const [, datos] = argsDe(cola.add) as [string, { de: string }];
      expect(datos.de).toBe('CO.877155788811553');
    });

    it('cae al wa_id del contacto cuando el mensaje no trae from', async () => {
      const sinFrom = {
        id: 'wamid.SIN_FROM',
        type: 'text',
        text: { body: 'Hola' },
      };

      await service.encolarEntrantes({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '1',
            changes: [
              {
                value: {
                  contacts: [{ wa_id: '573009998877' }],
                  messages: [sinFrom],
                },
              },
            ],
          },
        ],
      });

      const [, datos] = argsDe(cola.add) as [string, { de: string }];
      expect(datos.de).toBe('573009998877');
    });

    it('encola con el wamid como jobId para que un reintento de Meta no duplique', async () => {
      await service.encolarEntrantes(webhook([texto('wamid.ABC', 'hola')]));

      const [nombre, datos, opciones] = argsDe(cola.add) as [
        string,
        { de: string; texto: string; wamid: string },
        { jobId: string },
      ];
      expect(nombre).toBe('entrante');
      expect(datos).toEqual({
        de: '573001112233',
        texto: 'hola',
        wamid: 'wamid.ABC',
      });
      expect(opciones.jobId).toBe('wamid.ABC');
    });

    it('ignora lo que no sea texto: recibos de entrega, vistos, imagenes', async () => {
      await service.encolarEntrantes(
        webhook([
          { id: 'w1', from: '57300', type: 'image', image: { id: 'x' } },
          { id: 'w2', from: '57300', type: 'audio' },
          texto('w3', 'esto si'),
        ]),
      );

      expect(cola.add).toHaveBeenCalledTimes(1);
      const [, datos] = argsDe(cola.add) as [string, { texto: string }];
      expect(datos.texto).toBe('esto si');
    });

    it('no revienta con un payload que no reconoce', async () => {
      await expect(
        service.encolarEntrantes({ raro: true }),
      ).resolves.toBeUndefined();
      await expect(service.encolarEntrantes(null)).resolves.toBeUndefined();
      expect(cola.add).not.toHaveBeenCalled();
    });

    it('encola varios mensajes del mismo webhook', async () => {
      await service.encolarEntrantes(
        webhook([texto('w1', 'uno'), texto('w2', 'dos')]),
      );
      expect(cola.add).toHaveBeenCalledTimes(2);
    });
  });

  describe('responder', () => {
    const entrante = {
      de: '573001112233',
      texto: 'hola',
      wamid: 'wamid.ABC',
    };

    it('abre conversacion y guarda el telefono cuando el numero es nuevo', async () => {
      prisma.prospecto.findFirst.mockResolvedValue(null);
      chatbot.iniciar.mockResolvedValue({
        sesion_id: 'uuid-1',
        pregunta: {
          codigo: 'A1',
          texto: '¿Autorizas?',
          opciones: ['Sí', 'No'],
        },
      });

      await service.responder(entrante);

      expect(chatbot.iniciar).toHaveBeenCalledWith({
        canal_origen: 'whatsapp',
      });
      expect(prisma.prospecto.update).toHaveBeenCalledWith({
        where: { sesion_id: 'uuid-1' },
        data: { telefono: '573001112233' },
      });
    });

    it('busca la conversacion abierta de ese numero en el canal whatsapp', async () => {
      prisma.prospecto.findFirst.mockResolvedValue({ sesion_id: 'uuid-9' });
      chatbot.responder.mockResolvedValue({
        finalizado: false,
        pregunta: { codigo: 'A2', texto: 'Tu nombre?', opciones: null },
      });

      await service.responder(entrante);

      const [args] = argsDe(prisma.prospecto.findFirst) as [
        { where: Record<string, unknown> },
      ];
      expect(args.where).toEqual({
        telefono: '573001112233',
        canal_origen: 'whatsapp',
        pregunta_actual: { not: 'FIN' },
      });
      expect(chatbot.responder).toHaveBeenCalledWith({
        sesion_id: 'uuid-9',
        respuesta: 'hola',
      });
    });

    it('numera las opciones porque en whatsapp no hay desplegables', async () => {
      prisma.prospecto.findFirst.mockResolvedValue({ sesion_id: 'uuid-9' });
      chatbot.responder.mockResolvedValue({
        finalizado: false,
        pregunta: {
          codigo: 'A8',
          texto: '¿Cuantas aves?',
          opciones: ['<1000', '>10000'],
        },
      });

      await service.responder(entrante);

      const [, datos] = argsDe(cola.add) as [string, { texto: string }];
      expect(datos.texto).toBe('¿Cuantas aves?\n\n1. <1000\n2. >10000');
    });

    it('manda el cierre cuando la conversacion termina', async () => {
      prisma.prospecto.findFirst.mockResolvedValue({ sesion_id: 'uuid-9' });
      chatbot.responder.mockResolvedValue({
        finalizado: true,
        pregunta: null,
        clasificacion: 'caliente',
      });

      await service.responder(entrante);

      const [nombre, datos] = argsDe(cola.add) as [string, { texto: string }];
      expect(nombre).toBe('saliente');
      expect(datos.texto).toMatch(/asesor/);
    });

    it('le devuelve al prospecto el error del motor en vez de perderlo', async () => {
      prisma.prospecto.findFirst.mockResolvedValue({ sesion_id: 'uuid-9' });
      chatbot.responder.mockRejectedValue(
        new Error('Respuesta no valida para A8. Opciones: <1000 | >10000'),
      );

      await service.responder(entrante);

      const [, datos] = argsDe(cola.add) as [string, { texto: string }];
      expect(datos.texto).toMatch(/Respuesta no valida para A8/);
    });
  });

  describe('responder', () => {
    it('ignora el mensaje sin remitente y no toca la base', async () => {
      await service.responder({ de: '', texto: 'Hola', wamid: 'wamid.X' });

      expect(prisma.prospecto.findFirst).not.toHaveBeenCalled();
      expect(cola.add).not.toHaveBeenCalled();
    });
  });
});
