import { generateKeyPairSync } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from './push.service';

describe('PushService', () => {
  const prisma = {
    dispositivoPush: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const envOriginal = { ...process.env };
  const fetchOriginal = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  });

  afterEach(() => {
    process.env = { ...envOriginal };
    global.fetch = fetchOriginal;
  });

  async function crearServicio(): Promise<PushService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PushService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    return module.get<PushService>(PushService);
  }

  it('se deshabilita limpiamente si no hay credenciales de Firebase', async () => {
    const service = await crearServicio();
    expect(service.estaHabilitado()).toBe(false);

    const res = await service.enviarAUsuarios([1, 2], {
      titulo: 'Alerta crítica',
      mensaje: 'Temperatura alta',
    });

    expect(res).toEqual({ enviados: 0, fallidos: 0, omitido: true });
    expect(prisma.dispositivoPush.findMany).not.toHaveBeenCalled();
  });

  it('registra o actualiza el token del dispositivo para el usuario', async () => {
    const service = await crearServicio();
    prisma.dispositivoPush.upsert.mockResolvedValue({
      id: 4,
      usuario_id: 7,
      plataforma: 'android',
      activo: true,
    });

    const token = 'fcm_token_dispositivo_android_1234567890';
    const res = await service.registrarDispositivo(7, {
      token,
      plataforma: 'android',
    });

    expect(res.id).toBe(4);
    expect(prisma.dispositivoPush.upsert).toHaveBeenCalledWith({
      where: { token },
      create: {
        usuario_id: 7,
        token,
        plataforma: 'android',
        activo: true,
      },
      update: {
        usuario_id: 7,
        plataforma: 'android',
        activo: true,
      },
      select: {
        id: true,
        usuario_id: true,
        plataforma: true,
        activo: true,
        ultima_actualizacion: true,
      },
    });
  });

  it('desactiva el token del dispositivo del usuario al cerrar sesion', async () => {
    const service = await crearServicio();
    prisma.dispositivoPush.updateMany.mockResolvedValue({ count: 1 });

    const res = await service.desactivarDispositivo(
      7,
      'fcm_token_dispositivo_android_1234567890',
    );

    expect(res).toEqual({ desactivado: true });
  });

  it('envia push via FCM HTTP v1 y desactiva tokens UNREGISTERED', async () => {
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    process.env.FIREBASE_PROJECT_ID = 'avisens-test';
    process.env.FIREBASE_CLIENT_EMAIL = 'fcm@avisens-test.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY = privateKey;

    const service = await crearServicio();
    expect(service.estaHabilitado()).toBe(true);

    prisma.dispositivoPush.findMany.mockResolvedValue([
      { id: 10, token: 'token_valido_12345678901234567890' },
      { id: 11, token: 'token_vencido_1234567890123456789' },
    ]);
    prisma.dispositivoPush.updateMany.mockResolvedValue({ count: 1 });

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ access_token: 'oauth_token_demo', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () =>
          Promise.resolve(
            '{"error":{"status":"NOT_FOUND","details":[{"errorCode":"UNREGISTERED"}]}}',
          ),
      });
    global.fetch = fetchMock;

    const res = await service.enviarAUsuarios([5], {
      titulo: 'Alerta crítica',
      mensaje: 'Temperatura en 34 °C',
      tipo: 'alerta',
      referencia_tipo: 'alerta',
      referencia_id: 99,
    });

    expect(res).toEqual({ enviados: 1, fallidos: 1, omitido: false });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(prisma.dispositivoPush.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [11] } },
      data: { activo: false },
    });
  });
});
