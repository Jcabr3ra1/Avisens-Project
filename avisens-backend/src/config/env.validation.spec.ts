import 'reflect-metadata';
import { validateEnv } from './env.validation';

const BASE = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://local/test',
  JWT_SECRET: 'access-secret-at-least-32-characters',
  JWT_REFRESH_SECRET: 'refresh-secret-at-least-32-characters',
};

describe('validateEnv', () => {
  it('permite ejecutar pruebas sin dependencias externas configuradas', () => {
    expect(() => validateEnv(BASE)).not.toThrow();
  });

  it('exige el token interno de ML en producción', () => {
    expect(() =>
      validateEnv({
        ...BASE,
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://app.avisens.example',
        REDIS_URL: 'redis://redis:6379',
      }),
    ).toThrow(/ML_INTERNAL_TOKEN/);
  });

  // /metrics no lleva JWT, asi que si esta variable falta el endpoint
  // quedaria abierto a internet sin que nadie se entere. Mejor no arrancar.
  it('exige el token de métricas en producción', () => {
    expect(() =>
      validateEnv({
        ...BASE,
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://app.avisens.example',
        REDIS_URL: 'redis://redis:6379',
        ML_INTERNAL_TOKEN: 'ml-token-interno-at-least-32-characters',
      }),
    ).toThrow(/METRICS_TOKEN/);
  });

  it('acepta una configuración de producción completa', () => {
    expect(() =>
      validateEnv({
        ...BASE,
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://app.avisens.example',
        REDIS_URL: 'redis://redis:6379',
        ML_INTERNAL_TOKEN: 'ml-token-interno-at-least-32-characters',
        METRICS_TOKEN: 'metrics-token-at-least-32-characters',
      }),
    ).not.toThrow();
  });
});
