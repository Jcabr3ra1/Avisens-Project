import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { MetricsTokenGuard } from './metrics-token.guard';

describe('MetricsTokenGuard', () => {
  let guard: MetricsTokenGuard;
  const entornoOriginal = { ...process.env };

  const contextoCon = (authorization?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: authorization ? { authorization } : {},
        }),
      }),
    }) as unknown as ExecutionContext;

  const TOKEN = 'un-token-de-metricas-de-32-caracteres';

  beforeEach(() => {
    guard = new MetricsTokenGuard();
    delete process.env.METRICS_TOKEN;
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = entornoOriginal;
  });

  describe('con el token configurado', () => {
    beforeEach(() => {
      process.env.METRICS_TOKEN = TOKEN;
    });

    it('deja pasar al scraper con el token correcto', () => {
      expect(guard.canActivate(contextoCon(`Bearer ${TOKEN}`))).toBe(true);
    });

    it('rechaza un token equivocado', () => {
      expect(() =>
        guard.canActivate(contextoCon('Bearer otro-token-cualquiera-de-32-c')),
      ).toThrow(ForbiddenException);
    });

    it('rechaza cuando no viene la cabecera', () => {
      expect(() => guard.canActivate(contextoCon())).toThrow(
        ForbiddenException,
      );
    });

    it('rechaza el token correcto sin el prefijo Bearer', () => {
      expect(() => guard.canActivate(contextoCon(TOKEN))).toThrow(
        ForbiddenException,
      );
    });

    // Un token que empieza igual pero es más corto no puede colarse: la
    // comparación exige que la longitud coincida antes de mirar el contenido.
    it('rechaza un prefijo del token correcto', () => {
      expect(() =>
        guard.canActivate(contextoCon(`Bearer ${TOKEN.slice(0, 10)}`)),
      ).toThrow(ForbiddenException);
    });
  });

  describe('sin token configurado', () => {
    it('en producción rechaza en vez de quedar abierto', () => {
      process.env.NODE_ENV = 'production';

      expect(() => guard.canActivate(contextoCon())).toThrow(
        ForbiddenException,
      );
    });

    it('fuera de producción deja pasar, para no estorbar en local', () => {
      process.env.NODE_ENV = 'development';

      expect(guard.canActivate(contextoCon())).toBe(true);
    });
  });
});
