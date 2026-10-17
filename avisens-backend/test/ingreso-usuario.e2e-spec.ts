import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthModule } from '../src/modules/auth/auth.module';
import { ProspectosModule } from '../src/modules/prospectos/prospectos.module';
import { UsuariosModule } from '../src/modules/usuarios/usuarios.module';
import { RecuperacionesPasswordModule } from '../src/modules/recuperaciones-password/recuperaciones-password.module';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';

// Se ejecuta solo contra una base aislada proporcionada expresamente.
describe('Cuentas entregadas: usuario y contraseña (HTTP + PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let adminId: number;
  let propietarioId: number;
  let organizacionId: number;
  let rolPropietarioId: number;
  let convertidoId: number;
  let orgConvertidaId: number;
  let prospectoId: number;
  const sufijo = Date.now().toString(36);
  const username = `cliente.${sufijo}`;
  const password = 'ClaveDePrueba123!';
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const login = (usuario: string, clave = password) =>
    request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/v1/auth/login')
      .send({ username: usuario, password: clave });

  beforeAll(async () => {
    if (process.env.AVISENS_AUTH_TEST_DB !== 'aislada') {
      throw new Error(
        'Usa una base de pruebas aislada y AVISENS_AUTH_TEST_DB=aislada',
      );
    }
    const modulo = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        PrismaModule,
        AuthModule,
        UsuariosModule,
        RecuperacionesPasswordModule,
        ProspectosModule,
      ],
    }).compile();
    app = modulo.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new PrismaExceptionFilter());
    await app.init();
    prisma = modulo.get(PrismaService);
    const rol = await prisma.rol.upsert({
      where: { nombre: 'Administrador' },
      update: {},
      create: { nombre: 'Administrador' },
    });
    const propietario = await prisma.rol.upsert({
      where: { nombre: 'Propietario' },
      update: {},
      create: { nombre: 'Propietario' },
    });
    rolPropietarioId = propietario.id;
    const admin = await prisma.usuario.create({
      data: {
        nombre_completo: 'Admin prueba',
        cedula: `admin-${sufijo}`,
        username: `admin.${sufijo}`,
        password_hash: await bcrypt.hash(password, 4),
        rol_id: rol.id,
      },
    });
    adminId = admin.id;
    const ingreso = await login(admin.username).expect(200);
    token = (ingreso.body as { access_token: string }).access_token;
  });

  afterAll(async () => {
    if (prisma && adminId) {
      const ids = [adminId, propietarioId, convertidoId].filter(Boolean);
      if (prospectoId)
        await prisma.prospecto.delete({ where: { id: prospectoId } });
      if (convertidoId)
        await prisma.granja.deleteMany({
          where: { propietario_id: convertidoId },
        });
      await prisma.recuperacionPassword.deleteMany({
        where: { usuario_id: { in: ids } },
      });
      await prisma.notificacion.deleteMany({
        where: { usuario_id: { in: ids } },
      });
      await prisma.sesion.deleteMany({ where: { usuario_id: { in: ids } } });
      await prisma.seguridadCuenta.deleteMany({
        where: { usuario_id: { in: ids } },
      });
      await prisma.usuario.deleteMany({ where: { id: { in: ids } } });
      if (organizacionId)
        await prisma.organizacion.delete({ where: { id: organizacionId } });
      if (orgConvertidaId)
        await prisma.organizacion.delete({ where: { id: orgConvertidaId } });
    }
    await app?.close();
  });

  it('crea y entrega una cuenta sin exigir correo', async () => {
    const respuesta = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/v1/usuarios')
      .set(auth())
      .send({
        nombre_completo: 'María López',
        cedula: `cliente-${sufijo}`,
        username: ` ${username.toUpperCase()} `,
        password,
        rol_id: rolPropietarioId,
      })
      .expect(201);
    const cuenta = respuesta.body as {
      id: number;
      organizacion_id: number;
      username: string;
      email: null;
      password_hash?: string;
    };
    propietarioId = cuenta.id;
    organizacionId = cuenta.organizacion_id;
    expect(cuenta).toMatchObject({ username, email: null });
    expect(cuenta.password_hash).toBeUndefined();
    const ingreso = await login(` ${username.toUpperCase()} `).expect(200);
    expect((ingreso.body as { usuario: object }).usuario).toMatchObject({
      id: propietarioId,
      username,
      email: null,
    });
  });

  it('rechaza duplicados aunque cambien mayúsculas y no revela si falló usuario o clave', async () => {
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/v1/usuarios')
      .set(auth())
      .send({
        nombre_completo: 'Otra persona',
        cedula: `otra-${sufijo}`,
        username: username.toUpperCase(),
        password,
        rol_id: rolPropietarioId,
      })
      .expect(409);
    const malaClave = await login(username, 'incorrecta').expect(401);
    const inexistente = await login(`ausente.${sufijo}`).expect(401);
    expect((malaClave.body as { message: string }).message).toBe(
      (inexistente.body as { message: string }).message,
    );
    // PostgreSQL también impide insertar un usuario con mayúsculas por fuera del API.
    await expect(
      prisma.$executeRaw(
        Prisma.sql`UPDATE "usuarios" SET "username" = ${username.toUpperCase()} WHERE "id" = ${propietarioId}`,
      ),
    ).rejects.toThrow();
  });

  it('el contacto opcional puede añadirse y borrarse sin cambiar las credenciales', async () => {
    const endpoint = `/v1/usuarios/${propietarioId}`;
    const contacto = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .patch(endpoint)
      .set(auth())
      .send({ email: ` CONTACTO-${sufijo}@EJEMPLO.COM ` })
      .expect(200);
    expect((contacto.body as { email: string }).email).toBe(
      `contacto-${sufijo}@ejemplo.com`,
    );
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .patch(endpoint)
      .set(auth())
      .send({ email: '' })
      .expect(200);
    await login(username).expect(200);
  });

  it('recupera por usuario sin correo y exige reemplazar la contraseña temporal', async () => {
    const solicitar = (usuario: string) =>
      request(app.getHttpServer() as Parameters<typeof request>[0])
        .post('/v1/recuperaciones-password/solicitudes')
        .send({ username: usuario });
    const existente = await solicitar(username.toUpperCase()).expect(202);
    const inexistente = await solicitar(`ausente.${sufijo}`).expect(202);
    expect(existente.body).toEqual(inexistente.body);
    await solicitar(username).expect(202);
    expect(
      await prisma.recuperacionPassword.count({
        where: { usuario_id: propietarioId },
      }),
    ).toBe(1);
    const solicitud = await prisma.recuperacionPassword.findFirstOrThrow({
      where: { usuario_id: propietarioId },
    });
    const aprobada = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .patch(`/v1/recuperaciones-password/${solicitud.id}/aprobar`)
      .set(auth())
      .send({})
      .expect(200);
    const temporal = (aprobada.body as { password_temporal: string })
      .password_temporal;
    const ingreso = await login(username, temporal).expect(200);
    const datos = ingreso.body as {
      requiere_cambio_password: boolean;
      cambio_password_token: string;
      access_token?: string;
    };
    expect(datos.requiere_cambio_password).toBe(true);
    expect(datos.access_token).toBeUndefined();
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/v1/recuperaciones-password/cambiar-password')
      .set({ Authorization: `Bearer ${datos.cambio_password_token}` })
      .send({ nueva_password: `${password}Nueva` })
      .expect(201);
    await login(username, `${password}Nueva`).expect(200);
    await login(username, temporal).expect(401);
  });

  it('convierte un prospecto sin correo y revierte el alta si el usuario está ocupado', async () => {
    const prospecto = await prisma.prospecto.create({
      data: { sesion_id: `conversion-${sufijo}`, nombre: 'Cliente sin correo' },
    });
    prospectoId = prospecto.id;
    const datos = {
      nombre_completo: 'Cliente sin correo',
      cedula: `conversion-${sufijo}`,
      username,
      password,
      granja_nombre: 'Granja de prueba',
    };
    const organizacionesAntes = await prisma.organizacion.count();
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/v1/prospectos/${prospecto.id}/convertir`)
      .set(auth())
      .send(datos)
      .expect(409);
    expect(await prisma.organizacion.count()).toBe(organizacionesAntes);
    expect(
      (
        await prisma.prospecto.findUniqueOrThrow({
          where: { id: prospecto.id },
        })
      ).estado,
    ).toBe('nuevo');
    const convertido = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post(`/v1/prospectos/${prospecto.id}/convertir`)
      .set(auth())
      .send({ ...datos, username: `convertido.${sufijo}` })
      .expect(201);
    const cuenta = (
      convertido.body as {
        usuario: { id: number; organizacion_id: number; email: null };
      }
    ).usuario;
    convertidoId = cuenta.id;
    orgConvertidaId = cuenta.organizacion_id;
    expect(cuenta.email).toBeNull();
    expect(
      await prisma.granja.count({
        where: {
          propietario_id: convertidoId,
          organizacion_id: orgConvertidaId,
        },
      }),
    ).toBe(1);
    await login(`convertido.${sufijo}`).expect(200);
  });

  it('permite cambiar el usuario conservando identidad, contraseña y permisos', async () => {
    const nuevo = `nuevo.${sufijo}`;
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .patch(`/v1/usuarios/${propietarioId}`)
      .set(auth())
      .send({ username: nuevo.toUpperCase() })
      .expect(200);
    await login(username, `${password}Nueva`).expect(401);
    const ingreso = await login(nuevo, `${password}Nueva`).expect(200);
    expect((ingreso.body as { usuario: object }).usuario).toMatchObject({
      id: propietarioId,
      rol: 'Propietario',
      username: nuevo,
    });
  });
});
