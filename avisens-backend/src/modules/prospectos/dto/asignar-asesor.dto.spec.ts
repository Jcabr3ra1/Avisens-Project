import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AsignarAsesorDto } from './asignar-asesor.dto';

/**
 * El DTO llevaba un segundo campo, `admin_id`, como alias de `asesor_id`.
 * Estaba declarado `admin_id?: number` pero sin `@IsOptional()`: el `?` es de
 * TypeScript y class-validator no lo mira, así que exigía los dos campos a la
 * vez. La ruta devolvía 400 a todo el mundo, porque ningún cliente mandaba los
 * dos. Dos nombres para lo mismo es lo que produjo el fallo, así que el alias
 * se fue en vez de arreglarse.
 */
const validar = (cuerpo: Record<string, unknown>) =>
  validateSync(plainToInstance(AsignarAsesorDto, cuerpo)).flatMap((e) =>
    Object.values(e.constraints ?? {}),
  );

describe('AsignarAsesorDto', () => {
  it('acepta un cuerpo con solo asesor_id', () => {
    expect(validar({ asesor_id: 1 })).toEqual([]);
  });

  it('exige asesor_id', () => {
    expect(validar({}).join(' ')).toContain('asesor_id');
  });

  it('rechaza un asesor_id que no sea entero positivo', () => {
    expect(validar({ asesor_id: 0 }).length).toBeGreaterThan(0);
    expect(validar({ asesor_id: -3 }).length).toBeGreaterThan(0);
    expect(validar({ asesor_id: 1.5 }).length).toBeGreaterThan(0);
  });

  it('ya no declara el alias admin_id', () => {
    expect('admin_id' in new AsignarAsesorDto()).toBe(false);
  });
});
