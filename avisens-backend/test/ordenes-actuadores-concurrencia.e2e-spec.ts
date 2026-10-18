import { ConflictException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { OrdenesActuadoresModule } from '../src/modules/ordenes-actuadores/ordenes-actuadores.module';
import { OrdenesActuadoresService } from '../src/modules/ordenes-actuadores/ordenes-actuadores.service';
import { validateEnv } from '../src/config/env.validation';
import { usernameDePrueba } from './soporte/username';

// Contra Postgres real: lo que el mock no puede probar es que el índice único
// parcial de la migración de verdad impide dos órdenes en curso sobre el
// mismo relé, y que eliminar un usuario no se bloquea por sus órdenes.
describe('Órdenes de actuadores contra la base (e2e)', () => {
  let modulo: TestingModule;
  let prisma: PrismaService;
  let servicio: OrdenesActuadoresService;

  const sufijo = `${Date.now()}-${process.pid}`;
  const ids = {
    organizacion: 0,
    usuarios: [] as number[],
    granja: 0,
    galpon: 0,
    dispositivo: 0,
    sensor: 0,
  };
  let propietario = { id: 0, rol: 'Propietario', organizacion_id: 0 };

  beforeAll(async () => {
    modulo = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        PrismaModule,
        OrdenesActuadoresModule,
      ],
    }).compile();
    await modulo.init();
    prisma = modulo.get(PrismaService);
    servicio = modulo.get(OrdenesActuadoresService);

    const rol = await prisma.rol.upsert({
      where: { nombre: 'Propietario' },
      update: {},
      create: { nombre: 'Propietario' },
    });
    const org = await prisma.organizacion.create({
      data: { nombre: `E2E ordenes ${sufijo}` },
    });
    ids.organizacion = org.id;
    const crearUsuario = (tipo: string) =>
      prisma.usuario.create({
        data: {
          nombre_completo: tipo,
          cedula: `${tipo}-${sufijo}`,
          username: usernameDePrueba(`${tipo}-${sufijo}@e2e.local`),
          email: `${tipo}-${sufijo}@e2e.local`,
          password_hash: 'sin-uso-en-este-test',
          rol_id: rol.id,
          organizacion_id: org.id,
        },
      });
    const dueno = await crearUsuario('dueno-ordenes');
    ids.usuarios.push(dueno.id);
    propietario = { id: dueno.id, rol: 'Propietario', organizacion_id: org.id };

    const granja = await prisma.granja.create({
      data: { nombre: 'Ordenes', propietario_id: dueno.id, organizacion_id: org.id },
    });
    ids.granja = granja.id;
    const galpon = await prisma.galpon.create({
      data: { granja_id: granja.id, codigo: `GO-${sufijo}`, nombre: 'Ordenes' },
    });
    ids.galpon = galpon.id;
    const dispositivo = await prisma.dispositivo.create({
      data: {
        galpon_id: galpon.id,
        codigo_topic: `ordenes-${sufijo}`,
        nombre: 'Nodo órdenes',
        ultima_conexion: new Date(),
      },
    });
    ids.dispositivo = dispositivo.id;
    const sensor = await prisma.sensor.create({
      data: {
        galpon_id: galpon.id,
        dispositivo_id: dispositivo.id,
        codigo: `REL-K2-${sufijo}`,
        tipo: 'Ventiladores (K2)',
        unidad_medida: 'estado',
      },
    });
    ids.sensor = sensor.id;
  });

  afterEach(async () => {
    await prisma.ordenActuador.deleteMany({ where: { sensor_id: ids.sensor } });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.ordenActuador.deleteMany({ where: { sensor_id: ids.sensor } });
      await prisma.estadoActuador.deleteMany({ where: { sensor_id: ids.sensor } });
      await prisma.sensor.deleteMany({ where: { id: ids.sensor } });
      await prisma.dispositivo.deleteMany({ where: { id: ids.dispositivo } });
      await prisma.galpon.deleteMany({ where: { id: ids.galpon } });
      await prisma.granja.deleteMany({ where: { id: ids.granja } });
      await prisma.usuario.deleteMany({ where: { id: { in: ids.usuarios } } });
      await prisma.organizacion.deleteMany({ where: { id: ids.organizacion } });
    }
    await modulo?.close();
  });

  it('cinco peticiones simultáneas sobre el mismo relé dejan una sola orden en curso', async () => {
    const resultados = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        servicio.crear({ sensor_id: ids.sensor, accion: 'encender' }, propietario),
      ),
    );

    const creadas = resultados.filter((r) => r.status === 'fulfilled');
    const rechazadas = resultados.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );
    expect(creadas).toHaveLength(1);
    // Todas las perdedoras reciben 409, vengan del chequeo o del índice.
    for (const r of rechazadas) expect(r.reason).toBeInstanceOf(ConflictException);

    const enCurso = await prisma.ordenActuador.count({
      where: { sensor_id: ids.sensor, estado: { in: ['pendiente', 'enviada'] } },
    });
    expect(enCurso).toBe(1);
  });

  it('el índice rechaza un segundo insert en curso aunque se salte el servicio', async () => {
    const datos = {
      dispositivo_id: ids.dispositivo,
      galpon_id: ids.galpon,
      sensor_id: ids.sensor,
      accion: 'apagar' as const,
    };
    await prisma.ordenActuador.create({ data: datos });
    await expect(prisma.ordenActuador.create({ data: datos })).rejects.toMatchObject({
      code: 'P2002',
    });
    // Una orden ya cerrada no cuenta: se puede crear otra en curso.
    await prisma.ordenActuador.updateMany({
      where: { sensor_id: ids.sensor },
      data: { estado: 'rechazada' },
    });
    await expect(prisma.ordenActuador.create({ data: datos })).resolves.toBeDefined();
  });

  it('eliminar al usuario que dio la orden la conserva con usuario_id nulo', async () => {
    const operador = await prisma.usuario.create({
      data: {
        nombre_completo: 'operador-borrable',
        cedula: `borrable-${sufijo}`,
        username: usernameDePrueba(`borrable-${sufijo}@e2e.local`),
        email: `borrable-${sufijo}@e2e.local`,
        password_hash: 'sin-uso-en-este-test',
        rol_id: (await prisma.rol.findUniqueOrThrow({ where: { nombre: 'Propietario' } })).id,
        organizacion_id: ids.organizacion,
      },
    });
    const orden = await prisma.ordenActuador.create({
      data: {
        dispositivo_id: ids.dispositivo,
        galpon_id: ids.galpon,
        sensor_id: ids.sensor,
        accion: 'encender',
        estado: 'aplicada',
        usuario_id: operador.id,
      },
    });

    await prisma.usuario.delete({ where: { id: operador.id } });

    const conservada = await prisma.ordenActuador.findUniqueOrThrow({ where: { id: orden.id } });
    expect(conservada.usuario_id).toBeNull();
  });

  it('actualizada_en avanza en cada cambio de estado (la web la usa como versión)', async () => {
    const orden = await prisma.ordenActuador.create({
      data: {
        dispositivo_id: ids.dispositivo,
        galpon_id: ids.galpon,
        sensor_id: ids.sensor,
        accion: 'encender',
      },
    });
    await new Promise((r) => setTimeout(r, 20));
    await prisma.ordenActuador.updateMany({
      where: { id: orden.id },
      data: { estado: 'enviada' } satisfies Prisma.OrdenActuadorUpdateManyMutationInput,
    });
    const despues = await prisma.ordenActuador.findUniqueOrThrow({ where: { id: orden.id } });
    expect(despues.actualizada_en.getTime()).toBeGreaterThan(orden.actualizada_en.getTime());
  });
});
