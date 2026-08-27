import { origenesPermitidos } from './cors';

const acepta = (config: string, origen: string) => {
  const r = origenesPermitidos(config);
  if (r === true) return true;
  return r.some((p) => (typeof p === 'string' ? p === origen : p.test(origen)));
};

describe('origenesPermitidos', () => {
  it('sin valor permite cualquier origen (solo pasa en desarrollo)', () => {
    expect(origenesPermitidos()).toBe(true);
    expect(origenesPermitidos('')).toBe(true);
    expect(origenesPermitidos('  ,  ')).toBe(true);
  });

  it('acepta varios dominios separados por coma', () => {
    const c = 'http://localhost:5173,http://localhost:8080';
    expect(acepta(c, 'http://localhost:5173')).toBe(true);
    expect(acepta(c, 'http://localhost:8080')).toBe(true);
    expect(acepta(c, 'http://localhost:3000')).toBe(false);
  });

  it('el comodin cubre las previsualizaciones de Vercel', () => {
    // Cada despliegue de una rama recibe un subdominio nuevo; sin esto el chat
    // quedaria roto en cada previsualizacion.
    const c = 'https://avisens-*.vercel.app';
    expect(acepta(c, 'https://avisens-abc123.vercel.app')).toBe(true);
    expect(acepta(c, 'https://avisens-otra-rama.vercel.app')).toBe(true);
  });

  it('el comodin NO abre la puerta a cualquier vercel.app', () => {
    const c = 'https://avisens-*.vercel.app';
    expect(acepta(c, 'https://malicioso.vercel.app')).toBe(false);
    expect(acepta(c, 'https://otro-proyecto.vercel.app')).toBe(false);
  });

  it('el comodin cubre una sola etiqueta, no varias', () => {
    const c = 'https://avisens-*.vercel.app';
    expect(acepta(c, 'https://avisens-x.otro.vercel.app')).toBe(false);
  });

  it('el patron va anclado: no vale como prefijo de otro dominio', () => {
    // Sin anclar, "avisens-x.vercel.app.malo.com" pasaria y un atacante podria
    // leer respuestas de la API desde su propio sitio.
    const c = 'https://avisens-*.vercel.app';
    expect(acepta(c, 'https://avisens-x.vercel.app.malo.com')).toBe(false);
    expect(acepta(c, 'https://malo.com/https://avisens-x.vercel.app')).toBe(false);
  });

  it('los puntos son literales, no comodines de expresion regular', () => {
    const c = 'https://avisens.com';
    expect(acepta(c, 'https://avisensXcom')).toBe(false);
  });

  it('mezcla dominios exactos con patrones', () => {
    const c = 'http://localhost:5173,https://avisens.vercel.app,https://avisens-*.vercel.app';
    expect(acepta(c, 'http://localhost:5173')).toBe(true);
    expect(acepta(c, 'https://avisens.vercel.app')).toBe(true);
    expect(acepta(c, 'https://avisens-pr-12.vercel.app')).toBe(true);
    expect(acepta(c, 'https://cualquiera.vercel.app')).toBe(false);
  });
});
