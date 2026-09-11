import {
  ETAPAS_ALIMENTACION,
  MARCAS_ALIMENTO,
  SEXOS_LOTE,
} from './vocabulario';

/**
 * Estas listas las comparten el lote, las curvas objetivo y el catálogo de
 * alimentos. Cambiar una sin las demás deja lotes sin curva con la que
 * compararse, así que conviene que el cambio duela al pasar por aquí.
 */
describe('vocabulario ganadero', () => {
  it('las marcas son las cuatro con las que se trabaja', () => {
    expect([...MARCAS_ALIMENTO]).toEqual([
      'italcol',
      'solla',
      'contegral',
      'finca',
    ]);
  });

  it('los sexos son los que distinguen las curvas', () => {
    expect([...SEXOS_LOTE]).toEqual(['macho', 'hembra', 'mixto']);
  });

  it('las etapas van en orden de vida del pollo', () => {
    expect([...ETAPAS_ALIMENTACION]).toEqual([
      'preiniciacion',
      'iniciacion',
      'engorde',
    ]);
  });

  it('ninguna lista trae repetidos ni vacíos', () => {
    for (const lista of [MARCAS_ALIMENTO, SEXOS_LOTE, ETAPAS_ALIMENTACION]) {
      expect(new Set(lista).size).toBe(lista.length);
      expect(lista.every((v) => v.trim().length > 0)).toBe(true);
    }
  });
});
