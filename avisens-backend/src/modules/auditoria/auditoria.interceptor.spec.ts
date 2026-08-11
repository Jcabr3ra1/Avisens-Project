import { of } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { AuditoriaInterceptor } from './auditoria.interceptor';
import { AuditoriaService } from './auditoria.service';

type ReqMock = {
  method: string;
  path: string;
  params?: Record<string, string>;
  body?: unknown;
  headers: Record<string, string | undefined>;
  ip?: string;
  user?: { id: number };
};

describe('AuditoriaInterceptor', () => {
  const registrar = jest.fn();
  const auditoria = { registrar } as unknown as AuditoriaService;
  const interceptor = new AuditoriaInterceptor(auditoria);

  const ctx = (req: ReqMock): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => req }),
    }) as unknown as ExecutionContext;

  const handler = (resp: unknown): CallHandler => ({ handle: () => of(resp) });

  const run = (req: ReqMock, resp: unknown = {}): Promise<void> =>
    new Promise((resolve) => {
      interceptor
        .intercept(ctx(req), handler(resp))
        .subscribe({ complete: () => resolve() });
    });

  const arg = (): Record<string, unknown> =>
    (registrar.mock.calls[0] as [Record<string, unknown>])[0];

  afterEach(() => jest.clearAllMocks());

  it('audita una escritura (POST) con accion crear, entidad y usuario del token', async () => {
    await run({
      method: 'POST',
      path: '/v1/lotes',
      params: {},
      body: { codigo: 'X' },
      headers: {},
      user: { id: 5 },
    });

    expect(registrar).toHaveBeenCalledTimes(1);
    expect(arg().accion).toBe('crear');
    expect(arg().entidad_afectada).toBe('lotes');
    expect(arg().usuario_id).toBe(5);
  });

  it('NO audita lecturas (GET)', async () => {
    await run({ method: 'GET', path: '/v1/lotes', headers: {} });
    expect(registrar).not.toHaveBeenCalled();
  });

  it('NO audita la ingesta de sensores (demasiado ruido)', async () => {
    await run({ method: 'POST', path: '/ingest', body: {}, headers: {} });
    expect(registrar).not.toHaveBeenCalled();
  });

  it('en login registra accion "login", saca el usuario de la respuesta y NO guarda el cuerpo', async () => {
    await run(
      {
        method: 'POST',
        path: '/v1/auth/login',
        body: { email: 'a@a.com', password: 'secreto' },
        headers: {},
      },
      { usuario: { id: 9 } },
    );

    expect(arg().accion).toBe('login');
    expect(arg().datos_despues).toBeUndefined();
    expect(arg().usuario_id).toBe(9);
  });

  it('redacta campos sensibles del cuerpo y toma el id de la ruta', async () => {
    await run({
      method: 'PATCH',
      path: '/v1/usuarios/3',
      params: { id: '3' },
      body: { nombre: 'Nuevo', password: 'p' },
      headers: {},
      user: { id: 1 },
    });

    const datos = arg().datos_despues as Record<string, unknown>;
    expect(datos.password).toBe('***');
    expect(datos.nombre).toBe('Nuevo');
    expect(arg().accion).toBe('actualizar');
    expect(arg().registro_id).toBe(3);
  });

  it('NO audita el refresh de token', async () => {
    await run({
      method: 'POST',
      path: '/v1/auth/refresh',
      body: {},
      headers: {},
    });
    expect(registrar).not.toHaveBeenCalled();
  });
});
