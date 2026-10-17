import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../src/config/env.validation';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { IndicadoresService } from '../src/modules/indicadores/indicadores.service';

// Contra Postgres real: verifica que el corte de fcr/epef en la fecha del
// pesaje sea INCLUSIVE (una fila de consumo el mismo dia del pesaje SI
// cuenta) y que una muerte real registrada DESPUES del pesaje no invalide
// el calculo -- ambos comportamientos dependen de como Prisma traduce los
// filtros de fecha a SQL contra una columna @db.Date real, algo que un
// mock de indicadores.service.spec.ts no puede confirmar por si solo.
describe('FCR/EPEF al corte del pesaje -- corte inclusivo y mortalidad posterior (e2e, Postgres real)', () => {
  let modulo: TestingModule;
  let prisma: PrismaService;
  let indicadoresService: IndicadoresService;

  const sufijo = `${Date.now()}-${process.pid}`;
  const fechaIngreso = new Date('2026-08-01');
  const fechaPesaje = new Date('2026-08-21'); // dia 21
  const fechaConsumoEnElPesaje = new Date('2026-08-21'); // mismo dia: debe contar
  const fechaConsumoDespuesDelPesaje = new Date('2026-08-25'); // no debe contar en fcr
  const fechaMuerteDespuesDelPesaje = new Date('2026-08-26'); // no debe invalidar fcr/epef

  const ids = {
    organizacion: 0,
    usuario: 0,
    granja: 0,
    galpon: 0,
    lote: 0,
  };

  beforeAll(async () => {
    modulo = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        PrismaModule,
      ],
      providers: [IndicadoresService],
    }).compile();

    prisma = modulo.get(PrismaService);
    indicadoresService = modulo.get(IndicadoresService);

    const rolPropietario = await prisma.rol.upsert({
      where: { nombre: 'Propietario' },
      update: {},
      create: { nombre: 'Propietario' },
    });

    const organizacion = await prisma.organizacion.create({
      data: { nombre: `Org fcr-corte ${sufijo}` },
    });
    ids.organizacion = organizacion.id;

    const usuario = await prisma.usuario.create({
      data: {
        rol_id: rolPropietario.id,
        organizacion_id: organizacion.id,
        nombre_completo: 'Propietario fcr-corte e2e',
        cedula: `FCR-${sufijo}`,
        email: `fcr-corte-${sufijo}@e2e.test`,
        password_hash: 'no-se-usa-en-este-test',
      },
    });
    ids.usuario = usuario.id;

    const granja = await prisma.granja.create({
      data: {
        propietario_id: usuario.id,
        organizacion_id: organizacion.id,
        nombre: `Granja fcr-corte ${sufijo}`,
      },
    });
    ids.granja = granja.id;

    const galpon = await prisma.galpon.create({
      data: {
        granja_id: granja.id,
        codigo: 'galpon-fcr-corte',
        nombre: 'Galpón fcr-corte e2e',
      },
    });
    ids.galpon = galpon.id;

    const lote = await prisma.lote.create({
      data: {
        galpon_id: galpon.id,
        codigo: `LOT-FCR-${sufijo}`,
        fecha_ingreso: fechaIngreso,
        cantidad_inicial: 1000,
      },
    });
    ids.lote = lote.id;

    await prisma.pesaje.create({
      data: {
        lote_id: lote.id,
        usuario_id: usuario.id,
        fecha: fechaPesaje,
        peso_promedio_g: 1000,
      },
    });

    // 500kg el mismo dia del pesaje (debe contar) + 300kg tres dias
    // despues (NO debe contar para fcr, si para consumo_acumulado_g).
    await prisma.consumoDiario.create({
      data: {
        lote_id: lote.id,
        usuario_id: usuario.id,
        fecha: fechaConsumoEnElPesaje,
        alimento_kg: 500,
      },
    });
    await prisma.consumoDiario.create({
      data: {
        lote_id: lote.id,
        usuario_id: usuario.id,
        fecha: fechaConsumoDespuesDelPesaje,
        alimento_kg: 300,
      },
    });

    // Muerte real DESPUES del pesaje: cuenta para mortalidad/consumo de
    // hoy, no para las aves vivas al corte del pesaje.
    await prisma.registroMortalidad.create({
      data: {
        lote_id: lote.id,
        usuario_id: usuario.id,
        fecha: fechaMuerteDespuesDelPesaje,
        cantidad_aves: 50,
      },
    });
  });

  afterAll(async () => {
    await prisma.indicadorLote.deleteMany({ where: { lote_id: ids.lote } });
    await prisma.registroMortalidad.deleteMany({
      where: { lote_id: ids.lote },
    });
    await prisma.consumoDiario.deleteMany({ where: { lote_id: ids.lote } });
    await prisma.pesaje.deleteMany({ where: { lote_id: ids.lote } });
    await prisma.lote.delete({ where: { id: ids.lote } });
    await prisma.galpon.delete({ where: { id: ids.galpon } });
    await prisma.granja.delete({ where: { id: ids.granja } });
    await prisma.usuario.delete({ where: { id: ids.usuario } });
    await prisma.organizacion.delete({ where: { id: ids.organizacion } });
    await modulo.close();
  });

  it('fcr/epef usan solo el alimento hasta el pesaje (inclusive) y aves vivas al pesaje; mortalidad/consumo de hoy no cambian', async () => {
    const indicador = await indicadoresService.calcularParaLote(ids.lote);

    expect(indicador.estado_calculo).toBe('calculado');
    expect(indicador.estado_peso).toBe('disponible');

    // fcr = 500kg (SOLO el consumo del dia del pesaje, inclusive) /
    // (1000g/1000 * 1000 aves vivas al pesaje, sin mortalidad antes) = 0.5.
    // Si el corte fuera exclusivo o si la muerte posterior invalidara el
    // calculo, este valor seria distinto o null.
    expect(indicador.fcr as unknown as number).toBeCloseTo(0.5, 5);
    expect(indicador.epef).not.toBeNull();

    // consumo_acumulado_g SI incluye los 300kg posteriores (indicador de
    // hoy, independiente de fcr): (500+300)*1000/950 aves vivas hoy.
    expect(indicador.consumo_acumulado_g as unknown as number).toBeCloseTo(
      842.105,
      2,
    );
    // mortalidad_acumulada_pct SI cuenta la muerte posterior (50/1000).
    expect(
      indicador.mortalidad_acumulada_pct as unknown as number,
    ).toBeCloseTo(5, 5);
  });
});
