import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';

const UUID_VALIDO = '11111111-1111-4111-8111-111111111111';

function reqConBody(refresh_token: string) {
  return { body: { refresh_token } } as unknown as Parameters<
    JwtRefreshStrategy['validate']
  >[0];
}

describe('JwtRefreshStrategy', () => {
  let strategy: JwtRefreshStrategy;

  beforeEach(() => {
    const config = {
      getOrThrow: jest.fn().mockReturnValue('secreto-de-prueba'),
    } as unknown as ConfigService;
    strategy = new JwtRefreshStrategy(config);
  });

  it('acepta un payload completo y válido, devolviendo session_id en el resultado', () => {
    const resultado = strategy.validate(reqConBody('token'), {
      sub: 1,
      email: 'a@a.com',
      rol: 'Operario',
      jti: 'un-jti',
      session_id: UUID_VALIDO,
    });

    expect(resultado.session_id).toBe(UUID_VALIDO);
    expect(resultado.refresh_token).toBe('token');
  });

  it('rechaza (401) un token sin session_id -- el caso real de un token emitido antes de este cambio', () => {
    expect(() =>
      strategy.validate(reqConBody('token'), {
        sub: 1,
        email: 'a@a.com',
        rol: 'Operario',
        jti: 'un-jti',
        // sin session_id
      }),
    ).toThrow(UnauthorizedException);
  });

  it('rechaza (401) un session_id que no tiene forma de UUID', () => {
    expect(() =>
      strategy.validate(reqConBody('token'), {
        sub: 1,
        email: 'a@a.com',
        rol: 'Operario',
        jti: 'un-jti',
        session_id: 'no-es-un-uuid',
      }),
    ).toThrow(UnauthorizedException);
  });

  it('rechaza (401) un token sin jti', () => {
    expect(() =>
      strategy.validate(reqConBody('token'), {
        sub: 1,
        email: 'a@a.com',
        rol: 'Operario',
        session_id: UUID_VALIDO,
        // sin jti
      }),
    ).toThrow(UnauthorizedException);
  });

  it('rechaza (401) un jti vacío', () => {
    expect(() =>
      strategy.validate(reqConBody('token'), {
        sub: 1,
        email: 'a@a.com',
        rol: 'Operario',
        jti: '',
        session_id: UUID_VALIDO,
      }),
    ).toThrow(UnauthorizedException);
  });

  it('rechaza (401) un sub ausente', () => {
    expect(() =>
      strategy.validate(reqConBody('token'), {
        email: 'a@a.com',
        rol: 'Operario',
        jti: 'un-jti',
        session_id: UUID_VALIDO,
      } as never),
    ).toThrow(UnauthorizedException);
  });

  it('rechaza (401) un sub que no es un entero positivo', () => {
    expect(() =>
      strategy.validate(reqConBody('token'), {
        sub: -1,
        email: 'a@a.com',
        rol: 'Operario',
        jti: 'un-jti',
        session_id: UUID_VALIDO,
      }),
    ).toThrow(UnauthorizedException);
  });
});
