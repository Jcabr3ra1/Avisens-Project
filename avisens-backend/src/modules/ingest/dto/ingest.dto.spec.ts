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
});
