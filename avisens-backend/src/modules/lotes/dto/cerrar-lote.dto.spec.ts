import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { ROLES } from '../../../common/auth/roles';
import { LotesController } from '../lotes.controller';
import { CerrarLoteDto } from './cerrar-lote.dto';

const VALIDOS: Record<string, unknown> = {
  fecha_salida_real: '2026-09-16',
  cantidad_aves_vendidas: 4850,
  peso_promedio_final_g: 2650,
  valor_venta_total_cop: 58000000,
};

async function errores(datos: Record<string, unknown>) {
  const dto = plainToInstance(CerrarLoteDto, datos);
  const resultado = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return resultado.map((error) => error.property);
}

describe('CerrarLoteDto', () => {
  it('acepta los datos de cierre completos', async () => {
    await expect(errores(VALIDOS)).resolves.toEqual([]);
  });

  it('permite omitir valor_venta_total_cop, precio_venta_kg_cop y confirmar_cierre', async () => {
    await expect(
      errores({
        fecha_salida_real: '2026-09-16',
        cantidad_aves_vendidas: 4850,
        peso_promedio_final_g: 2650,
      }),
    ).resolves.toEqual([]);
  });

  it('acepta precio_venta_kg_cop y confirmar_cierre opcionales', async () => {
    await expect(
      errores({
        ...VALIDOS,
        precio_venta_kg_cop: 4512.74,
        confirmar_cierre: true,
      }),
    ).resolves.toEqual([]);
  });

  it.each([
    'fecha_salida_real',
    'cantidad_aves_vendidas',
    'peso_promedio_final_g',
  ])('exige el campo obligatorio %s', async (campo) => {
    const incompleto = { ...VALIDOS };
    delete incompleto[campo];
    await expect(errores(incompleto)).resolves.toEqual([campo]);
  });

  it.each([
    ['fecha_salida_real', 'no-es-fecha'],
    ['cantidad_aves_vendidas', -1],
    ['cantidad_aves_vendidas', 12.5],
    ['peso_promedio_final_g', 0],
    ['peso_promedio_final_g', -500],
    ['valor_venta_total_cop', -1000],
    ['precio_venta_kg_cop', 0],
    ['confirmar_cierre', 'si'],
  ])('valida el formato y rango de %s', async (clave, valor) => {
    await expect(errores({ ...VALIDOS, [clave]: valor })).resolves.toEqual([
      clave,
    ]);
  });

  it('la ruta de cierre admite al propietario y al administrador, no al operario', () => {
    const roles: unknown = Reflect.getMetadata(
      ROLES_KEY,
      Object.getOwnPropertyDescriptor(LotesController.prototype, 'cerrar')
        ?.value as object,
    );
    expect(roles).toEqual([ROLES.ADMINISTRADOR, ROLES.PROPIETARIO]);
  });
});
