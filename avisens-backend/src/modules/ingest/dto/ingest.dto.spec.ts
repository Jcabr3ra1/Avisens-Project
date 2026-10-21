import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IngestDto } from './ingest.dto';

describe('Identidad de lecturas IoT', () => {
  const errores = (lecturas: unknown[]) =>
    validate(plainToInstance(IngestDto, { lecturas }));
  it('acepta serial anterior o tipo y GPIO sin serial', async () => {
    expect(await errores([{ codigo: 'SERIAL', valor: 20 }])).toHaveLength(0);
    expect(
      await errores([
        { tipo: 'temperatura', canal: 'gpio:18', valor: 20 },
        { tipo: 'humedad', canal: 'gpio:18', valor: 60 },
      ]),
    ).toHaveLength(0);
  });
  it.each([
    { valor: 20 },
    { tipo: 'temperatura', valor: 20 },
    { canal: 'gpio:18', valor: 20 },
    { codigo: 'SERIAL', tipo: 'temperatura', canal: 'gpio:18', valor: 20 },
    { tipo: 'temperatura', canal: 'gpio:018', valor: 20 },
    { tipo: 'temperatura', canal: 'gpio:18', valor: Infinity },
  ])('rechaza identidades incompletas o ambiguas: %p', async (lectura) => {
    expect((await errores([lectura])).length).toBeGreaterThan(0);
  });
  it('rechaza conexiones duplicadas en el mismo lote', async () => {
    const lectura = { tipo: 'temperatura', canal: 'gpio:18', valor: 20 };
    expect((await errores([lectura, lectura])).length).toBeGreaterThan(0);
  });
  it('acepta los relés K1-K4 por canal con tipo "rele"', async () => {
    expect(
      await errores([
        { tipo: 'rele', canal: 'rele:k1', valor: 1 },
        { tipo: 'rele', canal: 'rele:k4', valor: 0 },
      ]),
    ).toHaveLength(0);
  });
  it.each([
    { tipo: 'rele', canal: 'rele:k5', valor: 1 },
    { tipo: 'temperatura', canal: 'rele:k1', valor: 1 },
    { tipo: 'rele', canal: 'gpio:18', valor: 1 },
    { codigo: 'REL-K1-G1-01', tipo: 'rele', canal: 'rele:k1', valor: 1 },
  ])('rechaza identidades de relé inválidas o mezcladas: %p', async (lectura) => {
    expect((await errores([lectura])).length).toBeGreaterThan(0);
  });
});

describe('Identidad del estado de relés', () => {
  const errores = (estados_reles: unknown[]) =>
    validate(
      plainToInstance(IngestDto, {
        lecturas: [{ codigo: 'S', valor: 1 }],
        estados_reles,
      }),
    );
  it('acepta el estado por canal (firmware nuevo) o por código (firmware anterior)', async () => {
    expect(
      await errores([
        { canal: 'rele:k1', modo: 'automatico', encendido: true },
        { codigo: 'REL-K2-G1-01', modo: 'manual_local', encendido: false },
      ]),
    ).toHaveLength(0);
  });
  it.each([
    { modo: 'automatico', encendido: true },
    { canal: 'rele:k9', modo: 'automatico', encendido: true },
    { canal: 'gpio:18', modo: 'automatico', encendido: true },
    { canal: 'rele:k1', codigo: 'REL-K1-G1-01', modo: 'automatico', encendido: true },
  ])('rechaza un estado sin identidad clara: %p', async (estado) => {
    expect((await errores([estado])).length).toBeGreaterThan(0);
  });
  it('rechaza el mismo canal dos veces en un envío', async () => {
    const e = { canal: 'rele:k2', modo: 'automatico', encendido: true };
    expect((await errores([e, e])).length).toBeGreaterThan(0);
  });
});
