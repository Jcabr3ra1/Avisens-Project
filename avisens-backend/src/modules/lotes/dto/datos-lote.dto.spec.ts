import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { ROLES } from '../../../common/auth/roles';
import { LotesController } from '../lotes.controller';
import { DatosLoteDto } from './datos-lote.dto';

const VALIDOS: Record<string, unknown> = {
  sexo: 'mixto',
  linea_genetica_id: 1,
  marca_alimento: 'italcol',
  proveedor_id: 3,
};

async function errores(datos: Record<string, unknown>) {
  const dto = plainToInstance(DatosLoteDto, datos);
  const resultado = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return resultado.map((error) => error.property);
}

describe('DatosLoteDto', () => {
  it('acepta los datos descriptivos completos', async () => {
    await expect(errores(VALIDOS)).resolves.toEqual([]);
  });

  it('exige todos los datos: ninguno es opcional', async () => {
    for (const campo of Object.keys(VALIDOS)) {
      const incompleto = { ...VALIDOS };
      delete incompleto[campo];
      await expect(errores(incompleto)).resolves.toEqual([campo]);
    }
  });

  it.each([
    ['raza', 'Ross 308'],
    ['cantidad_inicial', 9000],
    ['fecha_ingreso', '2026-10-01'],
    ['estado', 'finalizado'],
    ['galpon_id', 4],
  ])('rechaza %s, que no es un dato descriptivo', async (clave, valor) => {
    await expect(errores({ ...VALIDOS, [clave]: valor })).resolves.toEqual([
      clave,
    ]);
  });

  it.each([
    ['sexo', 'gallo'],
    ['linea_genetica_id', null],
    ['proveedor_id', 0],
    ['marca_alimento', 'otra'],
  ])('valida el formato de %s', async (clave, valor) => {
    await expect(errores({ ...VALIDOS, [clave]: valor })).resolves.toEqual([
      clave,
    ]);
  });

  it('la ruta de datos admite al propietario y al administrador, no al operario', () => {
    const roles: unknown = Reflect.getMetadata(
      ROLES_KEY,
      Object.getOwnPropertyDescriptor(
        LotesController.prototype,
        'actualizarDatos',
      )?.value as object,
    );
    expect(roles).toEqual([ROLES.ADMINISTRADOR, ROLES.PROPIETARIO]);
  });
});
