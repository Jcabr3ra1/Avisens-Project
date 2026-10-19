import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePesajeDto } from './create-pesaje.dto';

async function errores(peso: number) {
  const dto = plainToInstance(CreatePesajeDto, {
    lote_id: 1,
    fecha: '2026-10-17',
    peso_promedio_g: peso,
  });
  return (await validate(dto)).map((error) => error.property);
}

describe('CreatePesajeDto', () => {
  it('acepta un peso promedio realista', async () => {
    await expect(errores(2850)).resolves.toEqual([]);
    await expect(errores(10000)).resolves.toEqual([]);
  });

  it('rechaza pesos imposibles, como escribir 21 kg por ave', async () => {
    await expect(errores(21000)).resolves.toEqual(['peso_promedio_g']);
  });
});
