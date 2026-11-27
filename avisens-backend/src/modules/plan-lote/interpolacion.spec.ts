import { Prisma } from '@prisma/client';
import { PuntoInterpolacion, resolverDiaObjetivo } from './interpolacion';

function punto(
  dia: number,
  pesoEsperadoG: number | string,
): PuntoInterpolacion {
  return { dia, pesoEsperadoG: new Prisma.Decimal(pesoEsperadoG) };
}

function decimal(valor: number | string): Prisma.Decimal {
  return new Prisma.Decimal(valor);
}

describe('resolverDiaObjetivo', () => {
  const puntosBase: PuntoInterpolacion[] = [
    punto(1, 100),
    punto(2, 200),
    punto(3, 400),
  ];

  it('retorna datos_insuficientes con 0 puntos', () => {
    expect(resolverDiaObjetivo([], decimal(150))).toEqual({
      estado: 'datos_insuficientes',
    });
  });

  it('retorna datos_insuficientes con 1 solo punto', () => {
    expect(resolverDiaObjetivo([punto(1, 100)], decimal(150))).toEqual({
      estado: 'datos_insuficientes',
    });
  });

  it('retorna fuera_de_rango cuando el objetivo esta por debajo del primer peso', () => {
    expect(resolverDiaObjetivo(puntosBase, decimal(50))).toEqual({
      estado: 'fuera_de_rango',
    });
  });

  it('retorna fuera_de_rango cuando el objetivo esta por encima del ultimo peso', () => {
    expect(resolverDiaObjetivo(puntosBase, decimal(500))).toEqual({
      estado: 'fuera_de_rango',
    });
  });

  it('resuelve coincidencia exacta con el primer punto', () => {
    const resultado = resolverDiaObjetivo(puntosBase, decimal(100));

    expect(resultado.estado).toBe('calculado');
    if (resultado.estado !== 'calculado') return;
    expect(resultado.diaObjetivo).toBe(1);
    expect(resultado.diaObjetivoInterpolado.toFixed(6)).toBe('1.000000');
  });

  it('resuelve coincidencia exacta con el ultimo punto', () => {
    const resultado = resolverDiaObjetivo(puntosBase, decimal(400));

    expect(resultado.estado).toBe('calculado');
    if (resultado.estado !== 'calculado') return;
    expect(resultado.diaObjetivo).toBe(3);
    expect(resultado.diaObjetivoInterpolado.toFixed(6)).toBe('3.000000');
  });

  it('resuelve coincidencia exacta con un punto intermedio', () => {
    const resultado = resolverDiaObjetivo(puntosBase, decimal(200));

    expect(resultado.estado).toBe('calculado');
    if (resultado.estado !== 'calculado') return;
    expect(resultado.diaObjetivo).toBe(2);
    expect(resultado.diaObjetivoInterpolado.toFixed(6)).toBe('2.000000');
  });

  it('interpola entre dos puntos y aplica ceil sobre el valor sin redondear', () => {
    // dia = 1 + ((150 - 100) / (200 - 100)) * (2 - 1) = 1.5
    const resultado = resolverDiaObjetivo(puntosBase, decimal(150));

    expect(resultado.estado).toBe('calculado');
    if (resultado.estado !== 'calculado') return;
    expect(resultado.diaObjetivoInterpolado.toFixed(6)).toBe('1.500000');
    expect(resultado.diaObjetivo).toBe(2);
  });

  it('redondea el resultado interpolado a 6 decimales sin alterar el ceil', () => {
    // dia = 1 + ((101 - 100) / (103 - 100)) * (2 - 1) = 1.333333333...
    const puntos: PuntoInterpolacion[] = [punto(1, 100), punto(2, 103)];
    const resultado = resolverDiaObjetivo(puntos, decimal(101));

    expect(resultado.estado).toBe('calculado');
    if (resultado.estado !== 'calculado') return;
    expect(resultado.diaObjetivoInterpolado.toString()).toBe('1.333333');
    expect(resultado.diaObjetivo).toBe(2);
  });

  it('usa la formula exacta aprobada, no una aproximacion lineal distinta', () => {
    // dia = 5 + ((320 - 300) / (500 - 300)) * (10 - 5) = 5 + 0.1 * 5 = 5.5
    const puntos: PuntoInterpolacion[] = [punto(5, 300), punto(10, 500)];
    const resultado = resolverDiaObjetivo(puntos, decimal(320));

    expect(resultado.estado).toBe('calculado');
    if (resultado.estado !== 'calculado') return;
    expect(resultado.diaObjetivoInterpolado.toFixed(6)).toBe('5.500000');
    expect(resultado.diaObjetivo).toBe(6);
  });

  it('no vuelve a tocar el arreglo cuando hay menos de 2 puntos (evita acceso invalido)', () => {
    expect(() => resolverDiaObjetivo([], decimal(100))).not.toThrow();
  });
});
