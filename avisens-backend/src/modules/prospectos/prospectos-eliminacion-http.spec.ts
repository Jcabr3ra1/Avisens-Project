import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ProspectosController } from './prospectos.controller';
import { ProspectosService } from './prospectos.service';

describe('DELETE /prospectos/:id', () => {
  let app: INestApplication<Server>;
  const service = { eliminar: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProspectosController],
      providers: [
        { provide: ProspectosService, useValue: service },
        RolesGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context
            .switchToHttp()
            .getRequest<{
              headers: Record<string, string>;
              user?: { rol: string };
            }>();
          const rol = req.headers['x-test-rol'];
          if (!rol) throw new UnauthorizedException();
          req.user = { rol };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication<INestApplication<Server>>();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    service.eliminar.mockReset().mockResolvedValue({ id: 7, eliminado: true });
  });
  afterAll(async () => {
    await app.close();
  });

  it('admite al administrador con la confirmación exacta', async () => {
    await request(app.getHttpServer())
      .delete('/prospectos/7')
      .set('x-test-rol', 'Administrador')
      .send({ confirmacion: 'ELIMINAR' })
      .expect(200)
      .expect({ id: 7, eliminado: true });
    expect(service.eliminar).toHaveBeenCalledWith(7, 'ELIMINAR');
  });

  it('rechaza peticiones sin sesión', async () => {
    await request(app.getHttpServer())
      .delete('/prospectos/7')
      .send({ confirmacion: 'ELIMINAR' })
      .expect(401);
    expect(service.eliminar).not.toHaveBeenCalled();
  });

  it.each(['Propietario', 'Operario'])(
    'rechaza al rol %s con la guardia real de roles',
    async (rol) => {
      await request(app.getHttpServer())
        .delete('/prospectos/7')
        .set('x-test-rol', rol)
        .send({ confirmacion: 'ELIMINAR' })
        .expect(403);
      expect(service.eliminar).not.toHaveBeenCalled();
    },
  );

  it.each([{}, { confirmacion: 'eliminar' }, { confirmacion: true }])(
    'valida el cuerpo %j',
    async (body) => {
      await request(app.getHttpServer())
        .delete('/prospectos/7')
        .set('x-test-rol', 'Administrador')
        .send(body)
        .expect(400);
      expect(service.eliminar).not.toHaveBeenCalled();
    },
  );

  it('rechaza un ID que no sea entero', async () => {
    await request(app.getHttpServer())
      .delete('/prospectos/otro')
      .set('x-test-rol', 'Administrador')
      .send({ confirmacion: 'ELIMINAR' })
      .expect(400);
    expect(service.eliminar).not.toHaveBeenCalled();
  });
});
