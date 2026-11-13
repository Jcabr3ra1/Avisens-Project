import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMovimientoFinancieroDto } from './create-movimiento-financiero.dto';

async function mensajes(valor: number) {
  const dto = plainToInstance(CreateMovimientoFinancieroDto, {
    tipo: 'ingreso',
    categoria_id: 1,
    granja_id: 1,
    valor_cop: valor,
    fecha: '2026-10-31',
  });
  return (await validate(dto))
    .filter((error) => error.property === 'valor_cop')
    .flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('CreateMovimientoFinancieroDto (hallazgo de Finanzas)', () => {
  it('acepta montos reales, como los $100.000.000 de la prueba', async () => {
    await expect(mensajes(100_000_000)).resolves.toEqual([]);
  });

  it('rechaza el monto de 33 dígitos con un mensaje claro, sin llegar a la base', async () => {
    const resultado = await mensajes(1.333333335131313e32);
    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatch(/Ingrese un monto razonable/);
  });

  it('rechaza montos en cero o negativos', async () => {
    await expect(mensajes(0)).resolves.toEqual([
      'El monto debe ser mayor que cero',
    ]);
  });
});
