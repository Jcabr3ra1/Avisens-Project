import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateAlertasDto } from './create-alertas.dto';

// Este DTO no validaba la criticidad: era @IsString() a secas, así que
// aceptaba cualquier texto. Por ahí entraron las 'crítica' con tilde que
// convivían con las 'critica' sin ella.
describe('CreateAlertasDto · criticidad', () => {
  const validar = (criticidad: unknown) => {
    const dto = plainToInstance(CreateAlertasDto, {
      galpon_id: 1,
      tipo: 'temperatura',
      criticidad,
      mensaje: 'Temperatura fuera de rango',
    });
    return validateSync(dto).some((e) => e.property === 'criticidad');
  };

  it.each(['baja', 'media', 'alta'])('acepta %s', (nivel) => {
    expect(validar(nivel)).toBe(false);
  });

  it('rechaza la variante con tilde', () => {
    expect(validar('crítica')).toBe(true);
  });

  it('rechaza el nivel que se retiró de la escala', () => {
    expect(validar('critica')).toBe(true);
  });

  it('rechaza mayúsculas', () => {
    expect(validar('Alta')).toBe(true);
  });

  it('rechaza texto libre', () => {
    expect(validar('muy urgente')).toBe(true);
    expect(validar('')).toBe(true);
  });
});
