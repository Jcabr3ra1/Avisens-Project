import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { FirmaMetaGuard } from './firma-meta.guard';

describe('FirmaMetaGuard', () => {
  const SECRETO = 'secreto-de-prueba';
  const CUERPO = Buffer.from('{"entry":[{"id":"1"}]}');

  let guard: FirmaMetaGuard;
  let entornoPrevio: string | undefined;
  let secretoPrevio: string | undefined;

  const contexto = (
    cabecera: string | string[] | number | undefined,
    cuerpo: Buffer | null = CUERPO,
  ) =>
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

  const restaurar = (nombre: string, valor: string | undefined) => {
    if (valor === undefined) {
      delete process.env[nombre];
    } else {
      process.env[nombre] = valor;
    }
  };

  afterEach(() => {
    restaurar('NODE_ENV', entornoPrevio);
    restaurar('WHATSAPP_APP_SECRET', secretoPrevio);
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

  it('rechaza una firma valida con basura no hexadecimal al final', () => {
    expect(() => guard.canActivate(contexto(firmar(CUERPO) + 'zz'))).toThrow(
      ForbiddenException,
    );
  });

  it('rechaza una firma con un caracter no hexadecimal en medio', () => {
    const firma = firmar(CUERPO);
    const corrupta = firma.slice(0, 10) + 'g' + firma.slice(11);

    expect(() => guard.canActivate(contexto(corrupta))).toThrow(
      ForbiddenException,
    );
  });

  it('rechaza una firma valida con un medio byte sobrante', () => {
    expect(() => guard.canActivate(contexto(firmar(CUERPO) + 'a'))).toThrow(
      ForbiddenException,
    );
  });

  it('rechaza una firma valida con un byte extra', () => {
    expect(() => guard.canActivate(contexto(firmar(CUERPO) + '00'))).toThrow(
      ForbiddenException,
    );
  });

  it('rechaza una cabecera repetida recibida como arreglo', () => {
    const firma = firmar(CUERPO);

    expect(() => guard.canActivate(contexto([firma, firma]))).toThrow(
      ForbiddenException,
    );
  });

  it('rechaza una cabecera que no es cadena', () => {
    expect(() => guard.canActivate(contexto(12345))).toThrow(
      ForbiddenException,
    );
  });

  it('rechaza una firma de longitud impar', () => {
    expect(() =>
      guard.canActivate(contexto(firmar(CUERPO).slice(0, -1))),
    ).toThrow(ForbiddenException);
  });

  it('rechaza una firma truncada', () => {
    expect(() =>
      guard.canActivate(contexto(firmar(CUERPO).slice(0, -2))),
    ).toThrow(ForbiddenException);
  });

  it('rechaza una firma vacia despues del prefijo', () => {
    expect(() => guard.canActivate(contexto('sha256='))).toThrow(
      ForbiddenException,
    );
  });

  it('rechaza cuando la cabecera no lleva el prefijo sha256=', () => {
    const sinPrefijo = firmar(CUERPO).replace('sha256=', '');

    expect(() => guard.canActivate(contexto(sinPrefijo))).toThrow(
      ForbiddenException,
    );
  });

  it('acepta la firma en mayusculas hexadecimales', () => {
    const firma = firmar(CUERPO);
    const mayusculas = 'sha256=' + firma.slice('sha256='.length).toUpperCase();

    expect(guard.canActivate(contexto(mayusculas))).toBe(true);
  });

  describe('restauracion del entorno', () => {
    let original: string | undefined;

    beforeAll(() => {
      original = process.env.WHATSAPP_APP_SECRET;
      delete process.env.WHATSAPP_APP_SECRET;
    });

    afterAll(() => {
      try {
        expect(process.env).not.toHaveProperty('WHATSAPP_APP_SECRET');
      } finally {
        restaurar('WHATSAPP_APP_SECRET', original);
      }
    });

    it('acepta la firma correcta mientras el entorno previo no tenia secreto', () => {
      expect(guard.canActivate(contexto(firmar(CUERPO)))).toBe(true);
    });
  });

  it('firma el cuerpo crudo y no el JSON reserializado', () => {
    const crudo = Buffer.from('{ "entry": [ { "id": "1" } ] }\n');
    const reserializado = Buffer.from(
      JSON.stringify(JSON.parse(crudo.toString())),
    );
    const firmaDelCrudo = firmar(crudo);

    expect(guard.canActivate(contexto(firmaDelCrudo, crudo))).toBe(true);
    expect(() =>
      guard.canActivate(contexto(firmaDelCrudo, reserializado)),
    ).toThrow(ForbiddenException);
  });

  it('en produccion con secreto configurado valida la firma normalmente', () => {
    process.env.NODE_ENV = 'production';

    expect(guard.canActivate(contexto(firmar(CUERPO)))).toBe(true);
    expect(() => guard.canActivate(contexto(firmar(CUERPO, 'otro')))).toThrow(
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
