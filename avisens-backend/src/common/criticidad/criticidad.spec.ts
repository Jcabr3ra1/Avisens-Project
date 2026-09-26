import {
  CRITICIDADES,
  CRITICIDADES_GRAVES,
  esCriticidadGrave,
} from './criticidad';

describe('escala de criticidad', () => {
  it('tiene tres niveles, en minúscula y sin tildes', () => {
    expect(CRITICIDADES).toEqual(['baja', 'media', 'alta']);
    for (const nivel of CRITICIDADES) {
      expect(nivel).toBe(nivel.toLowerCase());
      expect(nivel).not.toMatch(/[áéíóú]/);
    }
  });

  // El cálculo automático desde umbrales tope en 'alta'. Si las graves no la
  // incluyeran, el tablero contaría cero mientras el sistema genera alertas
  // por lecturas muy fuera de rango: era exactamente el bug del contador.
  it('cuenta como grave el nivel más alto que el sistema escribe solo', () => {
    expect(esCriticidadGrave('alta')).toBe(true);
    expect(CRITICIDADES_GRAVES).toContain('alta');
  });

  it('no cuenta como graves las leves', () => {
    expect(esCriticidadGrave('media')).toBe(false);
    expect(esCriticidadGrave('baja')).toBe(false);
  });

  it('un valor fuera de la escala no cuela como grave', () => {
    expect(esCriticidadGrave('critica')).toBe(false);
    expect(esCriticidadGrave('crítica')).toBe(false);
    expect(esCriticidadGrave('Alta')).toBe(false);
    expect(esCriticidadGrave('')).toBe(false);
  });
});
