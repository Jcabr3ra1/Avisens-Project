import {
  avesVivasEnDia,
  clasificarMortalidad,
  RegistroMortalidadCrudo,
} from './mortalidad-snapshot';

const ingreso = new Date('2026-07-30T00:00:00.000Z');

function registro(dia: number, cantidadAves: number): RegistroMortalidadCrudo {
  // dia 1 = ingreso; se construye la fecha sumando (dia-1) dias sobre el
  // ingreso, en UTC puro (misma disciplina que fechaDeVida/diaDeVidaDeFecha).
  const fecha = new Date(ingreso.getTime());
  fecha.setUTCDate(fecha.getUTCDate() + (dia - 1));
  return { fecha, cantidadAves };
}

describe('clasificarMortalidad', () => {
  it('sin registros: snapshot vacio, 0 muertes, todas las aves vivas', () => {
    const resultado = clasificarMortalidad(ingreso, [], 10, 1000);

    expect(resultado).toEqual({
      valido: true,
      snapshot: [],
      muertesAlCorte: 0,
      avesVivasAlCorte: 1000,
    });
  });

  it('agrega varios registros del mismo dia en una sola entrada', () => {
    const registros = [registro(2, 10), registro(2, 5)];
    const resultado = clasificarMortalidad(ingreso, registros, 10, 1000);

    expect(resultado).toEqual({
      valido: true,
      snapshot: [{ dia: 2, muertes: 15 }],
      muertesAlCorte: 15,
      avesVivasAlCorte: 985,
    });
  });

  it('ordena el snapshot ascendente aunque los registros lleguen desordenados', () => {
    const registros = [registro(5, 10), registro(2, 15)];
    const resultado = clasificarMortalidad(ingreso, registros, 10, 1000);

    expect(resultado.valido).toBe(true);
    if (!resultado.valido) return;
    expect(resultado.snapshot).toEqual([
      { dia: 2, muertes: 15 },
      { dia: 5, muertes: 10 },
    ]);
  });

  it('rechaza cantidad_aves no positiva (registro_no_positivo)', () => {
    const resultado = clasificarMortalidad(ingreso, [registro(2, 0)], 10, 1000);

    expect(resultado.valido).toBe(false);
    if (resultado.valido) return;
    expect(resultado.violaciones).toEqual([
      {
        caso: 'registro_no_positivo',
        fecha: registro(2, 0).fecha,
        cantidadAves: 0,
      },
    ]);
  });

  it('rechaza mortalidad anterior al ingreso', () => {
    const fechaAnterior = new Date('2026-07-29T00:00:00.000Z');
    const resultado = clasificarMortalidad(
      ingreso,
      [{ fecha: fechaAnterior, cantidadAves: 5 }],
      10,
      1000,
    );

    expect(resultado.valido).toBe(false);
    if (resultado.valido) return;
    expect(resultado.violaciones).toEqual([
      { caso: 'mortalidad_antes_del_ingreso', dia: 0, muertes: 5 },
    ]);
  });

  it('rechaza mortalidad futura (posterior a dia_corte)', () => {
    const resultado = clasificarMortalidad(
      ingreso,
      [registro(15, 5)],
      10,
      1000,
    );

    expect(resultado.valido).toBe(false);
    if (resultado.valido) return;
    expect(resultado.violaciones).toEqual([
      { caso: 'mortalidad_futura', dia: 15, muertes: 5 },
    ]);
  });

  it('NO filtra por fecha antes de clasificar: un registro futuro se detecta, no se ignora', () => {
    // Si la consulta hubiera filtrado por fecha_corte, este registro jamas
    // habria llegado a clasificarMortalidad y el bug habria pasado inadvertido.
    const registros = [registro(2, 10), registro(15, 5)];
    const resultado = clasificarMortalidad(ingreso, registros, 10, 1000);

    expect(resultado.valido).toBe(false);
    if (resultado.valido) return;
    expect(resultado.violaciones).toContainEqual({
      caso: 'mortalidad_futura',
      dia: 15,
      muertes: 5,
    });
  });

  it('detecta aves_negativas en el primer dia donde la suma acumulada supera cantidad_inicial', () => {
    const registros = [registro(2, 600), registro(5, 500)];
    const resultado = clasificarMortalidad(ingreso, registros, 10, 1000);

    expect(resultado.valido).toBe(false);
    if (resultado.valido) return;
    expect(resultado.violaciones).toEqual([
      {
        caso: 'aves_negativas',
        dia: 5,
        muertesAcumuladas: 1100,
        cantidadInicial: 1000,
      },
    ]);
  });

  it('no reporta aves_negativas dos veces (un solo caso, no uno por dia)', () => {
    const registros = [registro(2, 600), registro(5, 500), registro(8, 200)];
    const resultado = clasificarMortalidad(ingreso, registros, 10, 1000);

    expect(resultado.valido).toBe(false);
    if (resultado.valido) return;
    expect(
      resultado.violaciones.filter((v) => v.caso === 'aves_negativas'),
    ).toHaveLength(1);
  });

  it('recoge TODAS las violaciones de una sola llamada, no solo la primera', () => {
    const fechaAnterior = new Date('2026-07-29T00:00:00.000Z');
    const registros = [
      registro(2, 0), // registro_no_positivo
      { fecha: fechaAnterior, cantidadAves: 5 }, // mortalidad_antes_del_ingreso
      registro(15, 5), // mortalidad_futura
    ];
    const resultado = clasificarMortalidad(ingreso, registros, 10, 1000);

    expect(resultado.valido).toBe(false);
    if (resultado.valido) return;
    expect(resultado.violaciones).toHaveLength(3);
    expect(resultado.violaciones.map((v) => v.caso).sort()).toEqual([
      'mortalidad_antes_del_ingreso',
      'mortalidad_futura',
      'registro_no_positivo',
    ]);
  });

  it('dia_corte = 0 (lote sin ingresar): cualquier registro es invalido', () => {
    const resultado = clasificarMortalidad(ingreso, [registro(1, 5)], 0, 1000);

    expect(resultado.valido).toBe(false);
    if (resultado.valido) return;
    expect(resultado.violaciones).toEqual([
      { caso: 'mortalidad_futura', dia: 1, muertes: 5 },
    ]);
  });
});

describe('avesVivasEnDia', () => {
  // N(d) = inicial - M(min(d-1, dia_corte)), convencion FIN DEL DIA aprobada.
  const snapshot = [
    { dia: 2, muertes: 15 },
    { dia: 5, muertes: 10 },
  ];
  const cantidadInicial = 1000;
  const diaCorte = 10;

  it('el dia 1 siempre tiene todas las aves iniciales (M(0) = 0)', () => {
    expect(avesVivasEnDia(snapshot, cantidadInicial, diaCorte, 1)).toBe(1000);
  });

  it('las muertes del dia d se descuentan desde d+1, no desde d (fin del dia)', () => {
    // dia 2: aun no se descuentan las 15 muertes DE ese mismo dia.
    expect(avesVivasEnDia(snapshot, cantidadInicial, diaCorte, 2)).toBe(1000);
    // dia 3: ya se descontaron las 15 del dia 2.
    expect(avesVivasEnDia(snapshot, cantidadInicial, diaCorte, 3)).toBe(985);
  });

  it('acumula muertes de multiples dias previos', () => {
    expect(avesVivasEnDia(snapshot, cantidadInicial, diaCorte, 6)).toBe(975);
  });

  it('se congela en aves_vivas_al_corte para dias posteriores a dia_corte', () => {
    expect(avesVivasEnDia(snapshot, cantidadInicial, diaCorte, 11)).toBe(975);
    expect(avesVivasEnDia(snapshot, cantidadInicial, diaCorte, 21)).toBe(975);
  });

  it('sin mortalidad, las aves vivas son siempre la cantidad inicial', () => {
    for (let dia = 1; dia <= 21; dia++) {
      expect(avesVivasEnDia([], cantidadInicial, diaCorte, dia)).toBe(1000);
    }
  });
});
