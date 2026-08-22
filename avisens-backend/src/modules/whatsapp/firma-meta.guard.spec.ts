import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { FirmaMetaGuard } from './firma-meta.guard';

describe('FirmaMetaGuard', () => {
  const SECRETO = 'secreto-de-prueba';
  const CUERPO = Buffer.from('{"entry":[{"id":"1"}]}');

  let guard: FirmaMetaGuard;
  let entornoPrevio: string | undefined;
  let secretoPrevio: string | undefined;

  const contexto = (cabecera: string | undefined, cuerpo: Buffer | null = CUERPO) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: cabecera ? { 'x-hub-signature-256': cabecera } : {},
          rawBody: cuerpo ?? undefined,
        }),
      }),
    }) as unknown as ExecutionContext;

  const firmar = (cuerpo: Buffer, secreto = SECRETO) =>
    'sha256=' + createHmac('sha256', secreto).update(cuerpo).digest('hex');

  beforeEach(() => {
    entornoPrevio = process.env.NODE_ENV;
    secretoPrevio = process.env.WHATSAPP_APP_SECRET;
    process.env.WHATSAPP_APP_SECRET = SECRETO;
    guard = new FirmaMetaGuard();
  });

  afterEach(() => {
    process.env.NODE_ENV = entornoPrevio;
    process.env.WHATSAPP_APP_SECRET = secretoPrevio;
  });

  it('acepta el webhook cuando la firma corresponde al cuerpo', () => {
    expect(guard.canActivate(contexto(firmar(CUERPO)))).toBe(true);
  });

  it('rechaza una firma calculada con otro secreto', () => {
    expect(() =>
      guard.canActivate(contexto(firmar(CUERPO, 'otro-secreto'))),
    ).toThrow(ForbiddenException);
  });

  it('rechaza si el cuerpo fue alterado despues de firmarlo', () => {
    const firma = firmar(CUERPO);
    const alterado = Buffer.from('{"entry":[{"id":"999"}]}');

    expect(() => guard.canActivate(contexto(firma, alterado))).toThrow(
      ForbiddenException,
    );
  });

  it('rechaza cuando no viene la cabecera', () => {
    expect(() => guard.canActivate(contexto(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('rechaza si falta el cuerpo crudo', () => {
    expect(() => guard.canActivate(contexto(firmar(CUERPO), null))).toThrow(
      ForbiddenException,
    );
  });

  it('en produccion rechaza si no hay secreto configurado', () => {
    delete process.env.WHATSAPP_APP_SECRET;
    process.env.NODE_ENV = 'production';

    expect(() => guard.canActivate(contexto(firmar(CUERPO)))).toThrow(
      ForbiddenException,
    );
  });

  it('fuera de produccion deja pasar sin secreto, para poder probar en local', () => {
    delete process.env.WHATSAPP_APP_SECRET;
    process.env.NODE_ENV = 'development';

    expect(guard.canActivate(contexto(undefined))).toBe(true);
  });
});
