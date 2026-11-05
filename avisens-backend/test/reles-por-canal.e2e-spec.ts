import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { validateEnv } from '../src/config/env.validation';
import { registrarRelesDispositivo } from '../src/modules/sensores/registro-reles';
import { usernameDePrueba } from './soporte/username';

// Contra Postgres real: lo que el mock no puede probar es que el índice único
// parcial "sensores_rele_canal_unico" impide dos relés en el mismo canal de un
// ESP32 aunque tengan distinto nombre, y que dos registros simultáneos no
// duplican nada.
describe('Relés por canal contra la base (e2e)', () => {
  let modulo: TestingModule;
  let prisma: PrismaService;

  const sufijo = `${Date.now()}-${process.pid}`;
  const ids = {
    organizacion: 0,
    usuario: 0,
    granja: 0,
    galpon: 0,
    dispositivos: [] as number[],
  };

  beforeAll(async () => {
    modulo = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        PrismaModule,
      ],
    }).compile();
    await modulo.init();
    prisma = modulo.get(PrismaService);

    const rol = await prisma.rol.upsert({
      where: { nombre: 'Propietario' },
      update: {},
      create: { nombre: 'Propietario' },
    });
    const org = await prisma.organizacion.create({
      data: { nombre: `E2E reles ${sufijo}` },
    });
    ids.organizacion = org.id;
    const dueno = await prisma.usuario.create({
      data: {
        nombre_completo: 'dueno-reles',
        cedula: `reles-${sufijo}`,
        username: usernameDePrueba(`reles-${sufijo}@e2e.local`),
        email: `reles-${sufijo}@e2e.local`,
        password_hash: 'sin-uso-en-este-test',
        rol_id: rol.id,
        organizacion_id: org.id,
      },
    });
    ids.usuario = dueno.id;
    const granja = await prisma.granja.create({
      data: { nombre: 'Reles', propietario_id: dueno.id, organizacion_id: org.id },
    });
    ids.granja = granja.id;
    const galpon = await prisma.galpon.create({
      data: { granja_id: granja.id, codigo: `GR-${sufijo}`, nombre: 'Reles' },
    });
    ids.galpon = galpon.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.medicion.deleteMany({ where: { sensor: { galpon_id: ids.galpon } } });
      await prisma.sensor.deleteMany({ where: { galpon_id: ids.galpon } });
      await prisma.dispositivo.deleteMany({ where: { id: { in: ids.dispositivos } } });
      await prisma.galpon.deleteMany({ where: { id: ids.galpon } });
      await prisma.granja.deleteMany({ where: { id: ids.granja } });
      await prisma.usuario.deleteMany({ where: { id: ids.usuario } });
      await prisma.organizacion.deleteMany({ where: { id: ids.organizacion } });
    }
    await modulo?.close();
  });

  async function nuevoEsp32(nombre: string) {
    const d = await prisma.dispositivo.create({
      data: { galpon_id: ids.galpon, codigo_topic: `${nombre}-${sufijo}`, nombre },
      select: { id: true, galpon_id: true },
    });
    ids.dispositivos.push(d.id);
    return d;
  }

  it('el índice impide dos relés en el mismo canal de un ESP32 aunque se llamen distinto', async () => {
    const esp32 = await nuevoEsp32('indice');
    const base = {
      galpon_id: ids.galpon,
      dispositivo_id: esp32.id,
      canal: 'rele:k1',
      unidad_medida: 'estado',
    };
    await prisma.sensor.create({
      data: { ...base, codigo: `IDX-A-${sufijo}`, tipo: 'Bombillos' },
    });
    await expect(
      prisma.sensor.create({
        data: { ...base, codigo: `IDX-B-${sufijo}`, tipo: 'Otro nombre' },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('dos registros simultáneos del mismo ESP32 dejan exactamente cuatro relés', async () => {
    const esp32 = await nuevoEsp32('carrera');

    const [a, b] = await Promise.all([
      registrarRelesDispositivo(prisma, esp32),
      registrarRelesDispositivo(prisma, esp32),
    ]);

    const reles = await prisma.sensor.findMany({
      where: { dispositivo_id: esp32.id },
      select: { canal: true },
      orderBy: { canal: 'asc' },
    });
    expect(reles.map((r) => r.canal)).toEqual(['rele:k1', 'rele:k2', 'rele:k3', 'rele:k4']);
    // Cada canal quedó creado por uno y reconocido como existente por el otro.
    for (let i = 0; i < 4; i++) {
      expect([a[i].resultado, b[i].resultado].sort()).toEqual(['creado', 'existente']);
    }
  });

  it('asocia un registro antiguo conservando su id y sus lecturas', async () => {
    const esp32 = await nuevoEsp32('legado');
    const antiguo = await prisma.sensor.create({
      data: {
        galpon_id: ids.galpon,
        dispositivo_id: esp32.id,
        codigo: `REL-K3-LEG-${sufijo}`,
        tipo: 'Extractores (K3)',
        unidad_medida: 'estado',
      },
    });
    await prisma.medicion.create({ data: { sensor_id: antiguo.id, valor: 1 } });

    const res = await registrarRelesDispositivo(prisma, esp32);

    expect(res[2]).toMatchObject({ resultado: 'asociado', sensor_id: antiguo.id });
    const despues = await prisma.sensor.findUniqueOrThrow({
      where: { id: antiguo.id },
      select: { canal: true, codigo: true, _count: { select: { mediciones: true } } },
    });
    expect(despues).toEqual({
      canal: 'rele:k3',
      codigo: `REL-K3-LEG-${sufijo}`,
      _count: { mediciones: 1 },
    });
  });

  it('dos ESP32 del mismo galpón usan los mismos canales sin chocar', async () => {
    const uno = await nuevoEsp32('dos-a');
    const otro = await nuevoEsp32('dos-b');
    await registrarRelesDispositivo(prisma, uno);
    const res = await registrarRelesDispositivo(prisma, otro);
    expect(res.every((c) => c.resultado === 'creado')).toBe(true);
  });
});
