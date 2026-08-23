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
    prospecto: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  };
  const chatbot = {
    iniciar: jest.fn(),
    responder: jest.fn(),
    preguntaActual: jest.fn(),
  };

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

    it('envia botones interactivos cuando las opciones son cortas', async () => {
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

      const [, datos] = argsDe(cola.add) as [
        string,
        { texto: string; botones?: Array<{ id: string; titulo: string }> },
      ];
      expect(datos.texto).toBe('¿Cuantas aves?');
      expect(datos.botones).toEqual([
        { id: 'btn_1', titulo: '<1000' },
        { id: 'btn_2', titulo: '>10000' },
      ]);
    });

    it('envia lista interactiva cuando hay mas de 3 opciones cortas', async () => {
      prisma.prospecto.findFirst.mockResolvedValue({ sesion_id: 'uuid-9' });
      chatbot.responder.mockResolvedValue({
        finalizado: false,
        pregunta: {
          codigo: 'A7',
          texto: '¿Cuantas aves por galpon?',
          opciones: ['<1000', '1000-5000', '5000-10000', '>10000'],
        },
      });

      await service.responder(entrante);

      const [, datos] = argsDe(cola.add) as [
        string,
        {
          texto: string;
          lista?: { boton: string; filas: Array<{ id: string; titulo: string }> };
        },
      ];
      expect(datos.texto).toBe('¿Cuantas aves por galpon?');
      expect(datos.lista?.boton).toBe('Ver opciones');
      expect(datos.lista?.filas).toHaveLength(4);
      expect(datos.lista?.filas[0]).toEqual({ id: 'opt_1', titulo: '<1000' });
    });

    it('cae a texto numerado cuando las opciones son muy largas', async () => {
      prisma.prospecto.findFirst.mockResolvedValue({ sesion_id: 'uuid-9' });
      chatbot.responder.mockResolvedValue({
        finalizado: false,
        pregunta: {
          codigo: 'A9',
          texto: '¿Estado del galpon?',
          opciones: [
            'Esta opcion es demasiado larga para boton o lista',
            'Otra opcion muy larga que no cabe',
          ],
        },
      });

      await service.responder(entrante);

      const [, datos] = argsDe(cola.add) as [string, { texto: string }];
      expect(datos.texto).toMatch(/1\. Esta opcion es demasiado larga/);
      expect(datos.texto).toMatch(/2\. Otra opcion muy larga/);
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

    it('no le filtra al prospecto el error tecnico del motor', async () => {
      prisma.prospecto.findFirst.mockResolvedValue({ sesion_id: 'uuid-9' });
      chatbot.responder.mockRejectedValue(
        new Error('Respuesta no valida para A8. Opciones: <1000 | >10000'),
      );
      chatbot.preguntaActual.mockResolvedValue({
        codigo: 'A8',
        texto: '¿Cuantas aves maneja la granja?',
        tipo: 'opcion_unica',
        opciones: ['<1000', '>10000'],
      });

      await service.responder(entrante);

      const [, datos] = argsDe(cola.add) as [string, { texto: string }];
      expect(datos.texto).not.toMatch(/Respuesta no valida/);
      expect(datos.texto).toMatch(/¿Cuantas aves maneja la granja\?/);
    });
  });

  describe('responder', () => {
    it('ignora el mensaje sin remitente y no toca la base', async () => {
      await service.responder({ de: '', texto: 'Hola', wamid: 'wamid.X' });

      expect(prisma.prospecto.findFirst).not.toHaveBeenCalled();
      expect(cola.add).not.toHaveBeenCalled();
    });
  });

  describe('cuando el chatbot rechaza la respuesta', () => {
    it('repite la pregunta en vez de mandar el error crudo', async () => {
      prisma.prospecto.findFirst.mockResolvedValue({ sesion_id: 'ses-1' });
      chatbot.responder.mockRejectedValue(
        new Error('Respuesta no valida para A1. Opciones: Sí | No'),
      );
      chatbot.preguntaActual.mockResolvedValue({
        codigo: 'A1',
        texto: '¿Autorizas el tratamiento de tus datos personales?',
        tipo: 'si_no',
        opciones: ['Sí', 'No'],
      });

      await service.responder({
        de: '573001112233',
        texto: 'Hola',
        wamid: 'wamid.X',
      });

      const salida = cola.add.mock.calls.at(-1) as [string, { texto: string }];
      expect(salida[1].texto).toMatch(/No te entendí/);
      expect(salida[1].texto).toMatch(/¿Autorizas el tratamiento/);
    });

    it('usa un aviso generico si no puede releer la pregunta', async () => {
      prisma.prospecto.findFirst.mockResolvedValue({ sesion_id: 'ses-1' });
      chatbot.responder.mockRejectedValue(new Error('lo que sea'));
      chatbot.preguntaActual.mockRejectedValue(new Error('base caida'));

      await service.responder({
        de: '573001112233',
        texto: 'Hola',
        wamid: 'wamid.X',
      });

      const salida = cola.add.mock.calls.at(-1) as [string, { texto: string }];
      expect(salida[1].texto).toMatch(/No te entendí/);
      expect(salida[1].texto).toMatch(/intentarlo de nuevo/);
    });
  });

  describe('cerrarInactivas', () => {
    it('cierra la conversacion y se despide de quien dejo de responder', async () => {
      prisma.prospecto.findMany.mockResolvedValue([
        { id: 3, telefono: '573001112233' },
      ]);

      const cerradas = await service.cerrarInactivas();

      expect(cerradas).toBe(1);

      const datos = (
        prisma.prospecto.update.mock.calls as Array<
          [{ data: Record<string, unknown> }]
        >
      )[0][0].data;
      expect(datos.pregunta_actual).toBe('FIN');
      expect(datos.estado).toBe('abandonado');
      expect(datos.fecha_finalizacion).toBeInstanceOf(Date);

      const [nombre, trabajo] = cola.add.mock.calls.at(-1) as [
        string,
        { destino: string; texto: string },
      ];
      expect(nombre).toBe('saliente');
      expect(trabajo.destino).toBe('573001112233');
      expect(trabajo.texto).toMatch(/cerramos esta conversación/);
    });

    it('cierra igual al prospecto sin telefono, pero no le encola nada', async () => {
      prisma.prospecto.findMany.mockResolvedValue([{ id: 4, telefono: null }]);

      await service.cerrarInactivas();

      expect(prisma.prospecto.update).toHaveBeenCalled();
      expect(cola.add).not.toHaveBeenCalled();
    });

    it('solo mira conversaciones de whatsapp que sigan abiertas', async () => {
      prisma.prospecto.findMany.mockResolvedValue([]);

      await service.cerrarInactivas();

      const [args] = prisma.prospecto.findMany.mock.calls[0] as [
        { where: Record<string, unknown> },
      ];
      expect(args.where.canal_origen).toBe('whatsapp');
      expect(args.where.pregunta_actual).toEqual({ not: 'FIN' });
      expect(args.where.ultima_actividad).toHaveProperty('lt');
    });
  });

  describe('mensajes de cierre segun la especificacion', () => {
    const mensaje = {
      de: '573001112233',
      texto: 'Sí',
      wamid: 'wamid.CIERRE',
    };

    const cerrarCon = async (r: Record<string, unknown>) => {
      prisma.prospecto.findFirst.mockResolvedValue({ sesion_id: 'uuid-9' });
      chatbot.responder.mockResolvedValue({ finalizado: true, pregunta: null, ...r });

      await service.responder(mensaje);

      const [, datos] = argsDe(cola.add) as [string, { texto: string }];
      return datos.texto;
    };

    it('al lead caliente le anuncia la visita tecnica en 24 horas', async () => {
      const texto = await cerrarCon({
        clasificacion: 'caliente',
        accion_siguiente: 'VISITA_PRESENCIAL',
      });
      expect(texto).toMatch(/cotización personalizada/);
      expect(texto).toMatch(/visita técnica/);
    });

    it('al lead tibio le ofrece la demostracion remota', async () => {
      const texto = await cerrarCon({
        clasificacion: 'tibio',
        accion_siguiente: 'DEMO_REMOTA',
      });
      expect(texto).toMatch(/demostración remota/);
    });

    it('al lead frio le anuncia contenido de valor', async () => {
      const texto = await cerrarCon({
        clasificacion: 'frio',
        accion_siguiente: 'SEGUIMIENTO_AUTOMATIZADO',
      });
      expect(texto).toMatch(/información útil/);
    });

    it('el callback del decisor manda sobre la clasificacion por puntaje', async () => {
      const texto = await cerrarCon({
        clasificacion: 'caliente',
        accion_siguiente: 'CALLBACK_DECISOR',
      });
      expect(texto).toMatch(/dentro de 48 horas/);
      expect(texto).not.toMatch(/visita técnica/);
    });

    it('a quien no autoriza no se le habla de cotizacion', async () => {
      const texto = await cerrarCon({ clasificacion: 'sin_consentimiento' });
      expect(texto).toMatch(/no podemos continuar con la cotización/);
      expect(texto).not.toMatch(/estamos generando/);
    });
  });
});
