import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { ROLES } from '../../../common/auth/roles';
import { GranjasController } from '../granjas.controller';
import { DatosGranjaDto } from './datos-granja.dto';

const VALIDOS: Record<string, unknown> = {
  direccion: 'Vereda El Rosal',
  municipio: 'Sabaneta',
  departamento: 'Antioquia',
};

async function errores(datos: Record<string, unknown>) {
  const dto = plainToInstance(DatosGranjaDto, datos);
  const resultado = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return resultado.map((error) => error.property);
}

describe('DatosGranjaDto', () => {
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
    ['nombre', 'Otra granja'],
    ['propietario_id', 7],
    ['activa', false],
    ['latitud', 6.15],
    ['longitud', -75.61],
    ['area_total_m2', 5000],
  ])('rechaza %s, que no es un dato descriptivo', async (clave, valor) => {
    await expect(errores({ ...VALIDOS, [clave]: valor })).resolves.toEqual([
      clave,
    ]);
  });

  it.each([
    ['direccion', ''],
    ['municipio', 42],
    ['departamento', 'x'.repeat(101)],
  ])('valida el formato de %s', async (clave, valor) => {
    await expect(errores({ ...VALIDOS, [clave]: valor })).resolves.toEqual([
      clave,
    ]);
  });

  it('la ruta de datos admite al propietario y al administrador, no al operario', () => {
    const roles: unknown = Reflect.getMetadata(
      ROLES_KEY,
      Object.getOwnPropertyDescriptor(
        GranjasController.prototype,
        'actualizarDatos',
      )?.value as object,
    );
    expect(roles).toEqual([ROLES.ADMINISTRADOR, ROLES.PROPIETARIO]);
  });
});
