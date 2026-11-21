import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateConsumoDiarioDto } from './create-consumo-diario.dto';

async function errores(valores: { alimento_kg?: number; agua_litros?: number }) {
  const dto = plainToInstance(CreateConsumoDiarioDto, {
    lote_id: 1,
    fecha: '2026-10-16',
    ...valores,
  });
  return (await validate(dto)).map((error) => error.property);
}

describe('CreateConsumoDiarioDto (QA-01)', () => {
  it('acepta consumos realistas de un galpón', async () => {
    await expect(
      errores({ alimento_kg: 110, agua_litros: 220 }),
    ).resolves.toEqual([]);
  });

  it('rechaza el alimento imposible que registró QA (1,1e+40 kg)', async () => {
    await expect(
      errores({ alimento_kg: 1.1e40 }),
    ).resolves.toEqual(['alimento_kg']);
  });

  it('rechaza el agua imposible que registró QA (1,1e+50 L)', async () => {
    await expect(
      errores({ agua_litros: 1.1e50 }),
    ).resolves.toEqual(['agua_litros']);
  });

  it('sigue rechazando valores negativos o en cero', async () => {
    await expect(errores({ alimento_kg: -5 })).resolves.toEqual([
      'alimento_kg',
    ]);
    await expect(errores({ agua_litros: 0 })).resolves.toEqual([
      'agua_litros',
    ]);
  });
});
