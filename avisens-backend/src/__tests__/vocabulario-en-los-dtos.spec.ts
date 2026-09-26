import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateLoteDto } from '../modules/lotes/dto/create-lote.dto';
import { CreateTipoAlimentoDto } from '../modules/tipos-alimento/dto/create-tipo-alimento.dto';
import { CreateCurvaObjetivoDto } from '../modules/curvas-objetivo/dto/create-curva-objetivo.dto';

/**
 * Estos campos eran texto libre. Escribir `Italcol S.A.` o `Macho ` con un
 * espacio dejaba al lote sin curva con la que compararse durante todo el
 * ciclo, y el único síntoma era un «sin referencia» semanas después.
 *
 * Los desplegables del front ya cerraron ese camino, pero por Bruno o
 * cualquier otro cliente seguía entrando. Estas pruebas fijan el rechazo.
 */
const errores = <T extends object>(
  Dto: new () => T,
  cuerpo: Record<string, unknown>,
) =>
  validateSync(plainToInstance(Dto, cuerpo)).flatMap((e) =>
    Object.keys(e.constraints ?? {}).map(() => e.property),
  );

const LOTE_MINIMO = {
  galpon_id: 1,
  fecha_ingreso: '2026-09-01',
  cantidad_inicial: 100,
};

describe('el lote sólo acepta el vocabulario conocido', () => {
  it('acepta una marca y un sexo de la lista', () => {
    expect(
      errores(CreateLoteDto, {
        ...LOTE_MINIMO,
        marca_alimento: 'italcol',
        sexo: 'macho',
      }),
    ).toEqual([]);
  });

  it.each(['Italcol S.A.', 'ITALCOL', 'purina', ''])(
    'rechaza la marca %p',
    (marca) => {
      expect(
        errores(CreateLoteDto, { ...LOTE_MINIMO, marca_alimento: marca }),
      ).toContain('marca_alimento');
    },
  );

  it.each(['M', 'Macho', 'macho ', ''])('rechaza el sexo %p', (sexo) => {
    expect(errores(CreateLoteDto, { ...LOTE_MINIMO, sexo })).toContain('sexo');
  });

  // Los dos siguen siendo opcionales: un lote puede no declararlos.
  it('deja crear un lote sin marca ni sexo', () => {
    expect(errores(CreateLoteDto, LOTE_MINIMO)).toEqual([]);
  });
});

describe('el catálogo de alimentos usa las mismas etapas', () => {
  it('acepta una etapa de la lista', () => {
    expect(
      errores(CreateTipoAlimentoDto, { nombre: 'X', etapa: 'engorde' }),
    ).toEqual([]);
  });

  // La cadena vacía es justo lo que entró por el formulario y dejó dos
  // alimentos de Solla sin etapa.
  it.each(['', 'preiniciador', 'Engorde', 'finalizacion'])(
    'rechaza la etapa %p',
    (etapa) => {
      expect(
        errores(CreateTipoAlimentoDto, { nombre: 'X', etapa }),
      ).toContain('etapa');
    },
  );
});

describe('la curva objetivo comparte el vocabulario', () => {
  const CURVA = { marca: 'italcol', sexo: 'macho', dia: 21 };

  it('acepta la combinación que sí tiene curva sembrada', () => {
    expect(errores(CreateCurvaObjetivoDto, CURVA)).toEqual([]);
  });

  it('rechaza una marca que no existe', () => {
    expect(
      errores(CreateCurvaObjetivoDto, { ...CURVA, marca: 'purina' }),
    ).toContain('marca');
  });

  it('rechaza una etapa con el nombre viejo', () => {
    expect(
      errores(CreateCurvaObjetivoDto, {
        ...CURVA,
        etapa_alimentacion: 'preiniciador',
      }),
    ).toContain('etapa_alimentacion');
  });
});
