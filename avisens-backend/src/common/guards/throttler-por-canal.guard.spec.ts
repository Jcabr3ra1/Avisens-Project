import {
  ThrottlerPorCanalGuard,
  esRutaIngesta,
} from './throttler-por-canal.guard';

describe('ThrottlerPorCanalGuard', () => {
  // getTracker no usa el estado del guard: basta el prototipo, sin montar el
  // módulo de throttling completo.
  const guard = Object.create(
    ThrottlerPorCanalGuard.prototype,
  ) as ThrottlerPorCanalGuard;
  const tracker = (req: Record<string, unknown>) =>
    (
      guard as unknown as {
        getTracker(r: Record<string, unknown>): Promise<string>;
      }
    ).getTracker(req);

  it('la ingesta del ESP32 cuenta aparte de la web aunque compartan IP', async () => {
    await expect(
      tracker({ ip: '190.1.2.3', originalUrl: '/ingest' }),
    ).resolves.toBe('ingest:190.1.2.3');
    await expect(
      tracker({ ip: '190.1.2.3', originalUrl: '/v1/ordenes-actuadores/ultimas?galpon_id=1' }),
    ).resolves.toBe('190.1.2.3');
  });

  it('solo /ingest es ingesta: rutas parecidas siguen en el cupo general', () => {
    expect(esRutaIngesta({ originalUrl: '/ingest?x=1' })).toBe(true);
    expect(esRutaIngesta({ originalUrl: '/ingest/algo' })).toBe(true);
    expect(esRutaIngesta({ originalUrl: '/ingestion' })).toBe(false);
    expect(esRutaIngesta({ originalUrl: '/v1/ingest' })).toBe(false);
    expect(esRutaIngesta({})).toBe(false);
  });
});
