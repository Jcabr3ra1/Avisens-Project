import { ROLES } from '../common/auth/roles';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { AccionamientosEquiposController } from '../modules/accionamientos-equipos/accionamientos-equipos.controller';
import { AlertasCanalesController } from '../modules/alertas-canales/alertas-canales.controller';
import { AlertasController } from '../modules/alertas/alertas.controller';
import { ConsumosDiariosController } from '../modules/consumos-diarios/consumos-diarios.controller';
import { DispositivosController } from '../modules/dispositivos/dispositivos.controller';
import { EventosSanitariosController } from '../modules/eventos-sanitarios/eventos-sanitarios.controller';
import { GalponesController } from '../modules/galpones/galpones.controller';
import { GranjasController } from '../modules/granjas/granjas.controller';
import { MantenimientoController } from '../modules/mantenimiento/mantenimiento.controller';
import { MedicionesController } from '../modules/mediciones/mediciones.controller';
import { PesajesController } from '../modules/pesajes/pesajes.controller';
import { RecomendacionesController } from '../modules/recomendaciones/recomendaciones.controller';
import { RegistrosMortalidadController } from '../modules/registros-mortalidad/registros-mortalidad.controller';
import { RegistrosPlagasController } from '../modules/registros-plagas/registros-plagas.controller';
import { SensoresController } from '../modules/sensores/sensores.controller';

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

  // El operario carga y corrige lo del día, pero no borra. Un registro
  // eliminado desaparece del histórico que alimenta los indicadores y las
  // alertas de desvío, y el alcance por galpón le dejaba borrar también lo
  // que cargó un compañero días atrás.
  describe('registros de campo: el operario registra y corrige, no borra', () => {
    const registros = [
      [RegistrosMortalidadController, 'registros de mortalidad'],
      [PesajesController, 'pesajes'],
      [ConsumosDiariosController, 'consumos diarios'],
      [RegistrosPlagasController, 'registros de plagas'],
      [EventosSanitariosController, 'eventos sanitarios'],
    ] as const;

    it.each(registros)('%p (%s) deja crear al operario', (controlador) => {
      expect(rolesDeClase(controlador)).toContain(ROLES.OPERARIO);
      expect(rolesDeMetodo(controlador, 'crear')).toBeUndefined();
    });

    it.each(registros)('%p (%s) NO deja borrar al operario', (controlador) => {
      const roles = rolesDeMetodo(controlador, 'eliminar');
      expect(roles).toBeDefined();
      expect(roles).not.toContain(ROLES.OPERARIO);
      expect(roles).toContain(ROLES.PROPIETARIO);
    });
  });

  // El borrado definitivo de infraestructura es del administrador, igual que
  // en granja, galpón y lote. El propietario sigue desactivando, que no
  // pierde el histórico colgado del sensor o el dispositivo.
  describe('infraestructura: el borrado definitivo es del administrador', () => {
    it.each([SensoresController, DispositivosController])(
      '%p reserva el borrado permanente al administrador',
      (controlador) => {
        expect(rolesDeMetodo(controlador, 'eliminarPermanente')).toEqual([
          ROLES.ADMINISTRADOR,
        ]);
      },
    );
  });

  // El estado de envío lo pone quien despacha la notificación, no una
  // persona: marcar "enviado" a mano tapaba que un aviso nunca salió.
  describe('canales de alerta: el estado de envío no es una ruta', () => {
    it.each(['marcarComoEnviado', 'marcarComoFallido', 'actualizarEstado'])(
      'AlertasCanalesController ya no expone %s',
      (metodo) => {
        const prototipo = AlertasCanalesController.prototype as unknown as Record<
          string,
          unknown
        >;
        expect(prototipo[metodo]).toBeUndefined();
      },
    );
  });
});
