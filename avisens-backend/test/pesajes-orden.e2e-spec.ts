import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../src/config/env.validation';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PesajesService } from '../src/modules/pesajes/pesajes.service';
import { IndicadoresService } from '../src/modules/indicadores/indicadores.service';

// Contra Postgres real (no Prisma simulado): Pesaje.fecha es @db.Date, así
// que varios pesajes del mismo día empatan de verdad en la base. Los tests
// unitarios de cada servicio (mediciones.service.spec.ts / pesajes.service.spec.ts)
// solo verifican que se envía el orderBy correcto a Prisma -- esto verifica
// que Postgres, con ese orderBy, desempata como se espera.
describe('Pesajes -- desempate por id cuando la fecha empata (e2e, Postgres real)', () => {
  let modulo: TestingModule;
  let prisma: PrismaService;
  let pesajesService: PesajesService;
  let indicadoresService: IndicadoresService;

  const sufijo = `${Date.now()}-${process.pid}`;
  const fechaEmpate = new Date('2026-06-15');

  const ids = {
    organizacion: 0,
    usuario: 0,
    granja: 0,
    galpon: 0,
    lote: 0,
    pesajes: [] as number[],
  };

  beforeAll(async () => {
    modulo = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        PrismaModule,
      ],
      providers: [PesajesService, IndicadoresService],
    }).compile();

    prisma = modulo.get(PrismaService);
    pesajesService = modulo.get(PesajesService);
    indicadoresService = modulo.get(IndicadoresService);

    // Autosuficiente: no asume que otra suite ya creo este rol. Mismo
    // patron de nucleo.e2e-spec.ts (upsert, nunca se borra -- es dato de
    // referencia compartido, no basura de este test).
    const rolPropietario = await prisma.rol.upsert({
      where: { nombre: 'Propietario' },
      update: {},
      create: { nombre: 'Propietario' },
    });

    const organizacion = await prisma.organizacion.create({
      data: { nombre: `Org pesajes ${sufijo}` },
    });
    ids.organizacion = organizacion.id;

    const usuario = await prisma.usuario.create({
      data: {
        rol_id: rolPropietario.id,
        organizacion_id: organizacion.id,
        nombre_completo: 'Propietario pesajes e2e',
        cedula: `PES-${sufijo}`,
        email: `pesajes-${sufijo}@e2e.test`,
        password_hash: 'no-se-usa-en-este-test',
      },
    });
    ids.usuario = usuario.id;

    const granja = await prisma.granja.create({
      data: {
        propietario_id: usuario.id,
        organizacion_id: organizacion.id,
        nombre: `Granja pesajes ${sufijo}`,
      },
    });
    ids.granja = granja.id;

    const galpon = await prisma.galpon.create({
      data: {
        granja_id: granja.id,
        codigo: 'galpon-pesajes',
        nombre: 'Galpón pesajes e2e',
      },
    });
    ids.galpon = galpon.id;

    const lote = await prisma.lote.create({
      data: {
        galpon_id: galpon.id,
        codigo: `LOT-PES-${sufijo}`,
        fecha_ingreso: new Date('2026-05-01'),
        cantidad_inicial: 1000,
      },
    });
    ids.lote = lote.id;

    // Tres pesajes con la MISMA fecha (el empate real) y pesos distintos,
    // creados en orden ascendente -- el de mayor id es el ultimo en entrar.
    for (const peso of [1000, 1500, 2000]) {
      const pesaje = await prisma.pesaje.create({
        data: {
          lote_id: lote.id,
          usuario_id: usuario.id,
          fecha: fechaEmpate,
          peso_promedio_g: peso,
        },
      });
      ids.pesajes.push(pesaje.id);
    }
  });

  afterAll(async () => {
    await prisma.indicadorLote.deleteMany({ where: { lote_id: ids.lote } });
    await prisma.pesaje.deleteMany({ where: { lote_id: ids.lote } });
    await prisma.lote.delete({ where: { id: ids.lote } });
    await prisma.galpon.delete({ where: { id: ids.galpon } });
    await prisma.granja.delete({ where: { id: ids.granja } });
    await prisma.usuario.delete({ where: { id: ids.usuario } });
    await prisma.organizacion.delete({ where: { id: ids.organizacion } });
    await modulo.close();
  });

  it('IndicadoresService.calcularParaLote toma el pesaje de mayor id entre los que empatan en fecha', async () => {
    const indicador = await indicadoresService.calcularParaLote(ids.lote);

    // El de mayor id (2000 g) es el ultimo de los tres, no el que Postgres
    // devolveria primero por casualidad de layout fisico si solo se
    // ordenara por fecha.
    expect(indicador.peso_promedio_g).toBe(2000);
  });

  it('PesajesService.listar mantiene el orden id DESC entre pesajes con la misma fecha', async () => {
    // Propietario acotado a sus propios lotes (no Admin con una pagina
    // global): asi el alcance por rol ya garantiza que solo aparecen los
    // 3 pesajes de este test, sin depender de una pagina lo bastante
    // grande para no perderlos entre datos de otras pruebas.
    const propietario = { id: ids.usuario, rol: 'Propietario' };
    const pagina = await pesajesService.listar(propietario, {
      page: 1,
      limit: 10,
    });

    expect(pagina.data.map((p) => p.id)).toEqual([...ids.pesajes].reverse());
  });
});
