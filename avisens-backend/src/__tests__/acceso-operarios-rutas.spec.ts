import { ROLES } from '../common/auth/roles';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { AccionamientosEquiposController } from '../modules/accionamientos-equipos/accionamientos-equipos.controller';
import { AlertasController } from '../modules/alertas/alertas.controller';
import { DispositivosController } from '../modules/dispositivos/dispositivos.controller';
import { GalponesController } from '../modules/galpones/galpones.controller';
import { GranjasController } from '../modules/granjas/granjas.controller';
import { MantenimientoController } from '../modules/mantenimiento/mantenimiento.controller';
import { MedicionesController } from '../modules/mediciones/mediciones.controller';
import { PesajesController } from '../modules/pesajes/pesajes.controller';
import { RecomendacionesController } from '../modules/recomendaciones/recomendaciones.controller';

type ClaseControlador = { prototype: object };

function rolesDeClase(controlador: ClaseControlador): string[] {
  return Reflect.getMetadata(ROLES_KEY, controlador) as string[];
}

function rolesDeMetodo(
  controlador: ClaseControlador,
  metodo: string,
): string[] | undefined {
  return Reflect.getMetadata(
    ROLES_KEY,
    (controlador.prototype as Record<string, object>)[metodo],
  ) as string[] | undefined;
}

describe('rutas habilitadas para Operarios', () => {
  it.each([
    GranjasController,
    GalponesController,
    DispositivosController,
    MedicionesController,
    PesajesController,
    AlertasController,
    AccionamientosEquiposController,
    MantenimientoController,
    RecomendacionesController,
  ])('%p declara acceso base para Operario', (controlador) => {
    expect(rolesDeClase(controlador)).toContain(ROLES.OPERARIO);
  });

  it.each([
    [GranjasController, 'crear'],
    [GalponesController, 'crear'],
    [DispositivosController, 'regenerarToken'],
    [MedicionesController, 'registrar'],
    [AlertasController, 'crear'],
    [AlertasController, 'actualizar'],
    [AlertasController, 'eliminar'],
    [AlertasController, 'escalar'],
    [MantenimientoController, 'create'],
    [MantenimientoController, 'agregarRepuesto'],
    [MantenimientoController, 'revertirRepuesto'],
  ])(
    '%p.%s conserva la mutación fuera del rol Operario',
    (controlador, metodo) => {
      const roles = rolesDeMetodo(controlador, metodo);
      expect(roles).toBeDefined();
      expect(roles).not.toContain(ROLES.OPERARIO);
    },
  );

  it.each([
    [PesajesController, 'crear'],
    [AlertasController, 'aceptar'],
    [AlertasController, 'cerrar'],
    [AccionamientosEquiposController, 'crear'],
    [AccionamientosEquiposController, 'cerrar'],
    [RecomendacionesController, 'resolver'],
  ])('%p.%s hereda el acceso operativo de la clase', (controlador, metodo) => {
    expect(rolesDeMetodo(controlador, metodo)).toBeUndefined();
    expect(rolesDeClase(controlador)).toContain(ROLES.OPERARIO);
  });
});
