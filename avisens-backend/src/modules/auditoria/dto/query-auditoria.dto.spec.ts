import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryAuditoriaDto } from './query-auditoria.dto';

async function errores(datos: Record<string, unknown>) {
  const dto = plainToInstance(QueryAuditoriaDto, datos);
  return (await validate(dto)).map((error) => error.property);
}

describe('QueryAuditoriaDto', () => {
  it('acepta un rango de fechas válido', async () => {
    await expect(
      errores({ desde: '2026-10-01', hasta: '2026-10-17' }),
    ).resolves.toEqual([]);
  });

  it('rechaza fechas imposibles aunque tengan el formato', async () => {
    await expect(
      errores({ desde: '2026-13-01', hasta: '2026-02-30' }),
    ).resolves.toEqual(['desde', 'hasta']);
  });

  it('rechaza fechas con hora', async () => {
    await expect(errores({ desde: '2026-10-01T10:00:00Z' })).resolves.toEqual([
      'desde',
    ]);
  });

  it('convierte el usuario a número y rechaza valores inválidos', async () => {
    await expect(errores({ usuario_id: '3' })).resolves.toEqual([]);
    await expect(errores({ usuario_id: 'abc' })).resolves.toEqual([
      'usuario_id',
    ]);
  });
});
