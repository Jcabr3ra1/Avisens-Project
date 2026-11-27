import { WhatsappController } from './whatsapp.controller';
import { DecimalInterceptor } from '../../common/decimal.interceptor';
import { lastValueFrom, of } from 'rxjs';
import type { Response } from 'express';
import type { ExecutionContext, CallHandler } from '@nestjs/common';

function respuestaFalsa() {
  const enviar = jest.fn();
  const estado = jest.fn();
  const res = { status: estado, send: enviar } as unknown as Response;
  estado.mockReturnValue(res);
  enviar.mockReturnValue(res);
  return { res, estado, enviar };
}

describe('WhatsappController · verificación del webhook', () => {
  const controlador = new WhatsappController({} as never);
  const original = process.env.WHATSAPP_VERIFY_TOKEN;

  beforeEach(() => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'token-de-prueba';
  });

  afterAll(() => {
    process.env.WHATSAPP_VERIFY_TOKEN = original;
  });

  it('responde el desafío de Meta con 200 cuando el token coincide', () => {
    const { res, estado, enviar } = respuestaFalsa();

    controlador.verificar('subscribe', 'token-de-prueba', '12345', res);

    expect(estado).toHaveBeenCalledWith(200);
    expect(enviar).toHaveBeenCalledWith('12345');
  });

  it('responde 403 cuando el token no coincide', () => {
    const { res, estado, enviar } = respuestaFalsa();

    controlador.verificar('subscribe', 'otro-token', '12345', res);

    expect(estado).toHaveBeenCalledWith(403);
    expect(enviar).toHaveBeenCalledWith('Forbidden');
  });

  it('no devuelve el objeto de respuesta de Express: el interceptor global lo recorrería sin fin', async () => {
    const { res } = respuestaFalsa();
    (res as unknown as Record<string, unknown>).req = { res };
    (res as unknown as Record<string, unknown>).socket = { _httpMessage: res };

    const devuelto = controlador.verificar('subscribe', 'token-de-prueba', 'x', res);

    expect(devuelto).toBeUndefined();
    const contexto = {} as ExecutionContext;
    const siguiente: CallHandler = { handle: () => of(devuelto) };
    await expect(
      lastValueFrom(new DecimalInterceptor().intercept(contexto, siguiente)),
    ).resolves.toBeUndefined();
  });
});
