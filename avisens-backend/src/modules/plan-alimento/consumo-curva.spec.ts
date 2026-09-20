import { Prisma } from '@prisma/client';
import { integrarConsumo, PuntoConsumo } from './consumo-curva';
import { avesVivasEnDia } from './mortalidad-snapshot';

function punto(dia: number, consumoAcumuladoG: number | string): PuntoConsumo {
  return { dia, consumoAcumuladoG: new Prisma.Decimal(consumoAcumuladoG) };
}

describe('integrarConsumo', () => {
  it('retorna sin_consumo_en_curva sin puntos', () => {
    expect(integrarConsumo([], 21, () => 1000)).toEqual({
      estado: 'sin_consumo_en_curva',
    });
  });

  it('retorna consumo_insuficiente con un solo punto', () => {
    expect(integrarConsumo([punto(7, 140)], 21, () => 1000)).toEqual({
      estado: 'consumo_insuficiente',
    });
  });

  it('retorna consumo_fuera_de_rango si el dia objetivo excede el ultimo punto con consumo', () => {
    const puntos = [punto(7, 140), punto(14, 490)];
    expect(integrarConsumo(puntos, 21, () => 1000)).toEqual({
      estado: 'consumo_fuera_de_rango',
    });
  });

  it('coincidencia exacta en un punto: no interpola', () => {
    const puntos = [punto(7, 140), punto(14, 490)];
    const resultado = integrarConsumo(puntos, 14, () => 1000);

    expect(resultado.estado).toBe('calculado');
    if (resultado.estado !== 'calculado') return;
    expect(resultado.consumoPorAveG.toFixed(2)).toBe('490.00');
  });

  it('ancla virtual (dia 0, 0 g): interpola desde el origen aunque la curva empiece en el dia 7', () => {
    const puntos = [punto(7, 140), punto(14, 490)];
    const resultado = integrarConsumo(puntos, 7, () => 1000);

    expect(resultado.estado).toBe('calculado');
    if (resultado.estado !== 'calculado') return;
    // acum(7) = 140 exacto (coincide con el punto), pero el CONSUMO del dia 1
    // (via ancla 0,0) debe ser > 0: lo verifica el invariante de abajo.
    expect(resultado.consumoPorAveG.toFixed(2)).toBe('140.00');
  });

  it('invariante de control: sin mortalidad, el total exacto es acum(D) x aves constantes', () => {
    const puntos = [punto(7, 140), punto(14, 490), punto(21, 1190)];
    const resultado = integrarConsumo(puntos, 21, () => 1000);

    expect(resultado.estado).toBe('calculado');
    if (resultado.estado !== 'calculado') return;
    expect(resultado.consumoPorAveG.toFixed(2)).toBe('1190.00');
    // 1190 g/ave * 1000 aves = 1 190 000 g = 1190.000 kg
    expect(resultado.consumoTotalKg.toFixed(3)).toBe('1190.000');
  });

  it('disciplina de redondeo: division periodica no se redondea a mitad de calculo', () => {
    // acum(1..7) interpolado linealmente desde (0,0) a (7,100): cada dia
    // suma 100/7 g, un decimal periodico. Sumar sin redondear en el medio
    // debe dar exactamente 100.00 al llegar al punto real.
    const puntos = [punto(7, 100), punto(14, 200)];
    const resultado = integrarConsumo(puntos, 7, () => 1);

    expect(resultado.estado).toBe('calculado');
    if (resultado.estado !== 'calculado') return;
    expect(resultado.consumoPorAveG.toFixed(2)).toBe('100.00');
    expect(resultado.consumoTotalKg.toFixed(3)).toBe('0.100');
  });

  it('lanza error explicito si la curva decrece (defensa en profundidad, no duplica validarParaPublicar)', () => {
    const puntos = [punto(7, 200), punto(14, 100)];
    expect(() => integrarConsumo(puntos, 14, () => 1000)).toThrow(
      /consumo decreciente/i,
    );
  });

  describe('ponderacion por aves vivas (ejemplo aprobado del diseño Fase 2A)', () => {
    // Curva: 7->140, 14->490, 21->1190. Lote de 1000 aves, mortalidad
    // dia 2 -> 15, dia 5 -> 10, dia_corte = 10. Convencion FIN DEL DIA:
    // N(d) = inicial - M(min(d-1, dia_corte)).
    const puntos = [punto(7, 140), punto(14, 490), punto(21, 1190)];
    const snapshot = [
      { dia: 2, muertes: 15 },
      { dia: 5, muertes: 10 },
    ];
    const diaCorte = 10;
    const cantidadInicial = 1000;

    const N = (dia: number) =>
      avesVivasEnDia(snapshot, cantidadInicial, diaCorte, dia);

    it('produce el total exacto verificado a mano en el diseño: 1161.850 kg', () => {
      const resultado = integrarConsumo(puntos, 21, N);

      expect(resultado.estado).toBe('calculado');
      if (resultado.estado !== 'calculado') return;
      expect(resultado.consumoPorAveG.toFixed(2)).toBe('1190.00');
      expect(resultado.consumoTotalKg.toFixed(3)).toBe('1161.850');
    });

    it('el total NO coincide con ninguna de las dos formulas ingenuas', () => {
      const resultado = integrarConsumo(puntos, 21, N);
      expect(resultado.estado).toBe('calculado');
      if (resultado.estado !== 'calculado') return;

      const conAvesVivasAlCorte = resultado.consumoPorAveG
        .mul(cantidadInicial - 25) // aves_vivas_al_corte = 1000 - 25
        .div(1000);
      const conCantidadInicial = resultado.consumoPorAveG
        .mul(cantidadInicial)
        .div(1000);

      expect(resultado.consumoTotalKg.toFixed(3)).not.toBe(
        conAvesVivasAlCorte.toFixed(3),
      );
      expect(resultado.consumoTotalKg.toFixed(3)).not.toBe(
        conCantidadInicial.toFixed(3),
      );
    });
  });
});
