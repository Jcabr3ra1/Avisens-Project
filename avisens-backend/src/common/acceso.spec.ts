import { ForbiddenException } from '@nestjs/common';
import { esPropietario, verificarDueno } from './acceso';

// El helper de alcance lo usan los 7 módulos con dueño: si se rompe aquí, se
// rompe el aislamiento entre propietarios en todo el sistema. Por eso se prueba.
describe('acceso', () => {
  const admin = { id: 1, rol: 'Administrador' };
  const propietario = { id: 5, rol: 'Propietario' };
  const operario = { id: 9, rol: 'Operario' };

  describe('esPropietario', () => {
    it('es true solo para el rol Propietario', () => {
      expect(esPropietario(propietario)).toBe(true);
      expect(esPropietario(admin)).toBe(false);
      expect(esPropietario(operario)).toBe(false);
    });
  });

  describe('verificarDueno', () => {
    it('el Administrador pasa siempre, aunque no sea el dueño', () => {
      expect(() => verificarDueno(admin, 999, 'msg')).not.toThrow();
    });

    it('el Propietario pasa si el recurso es suyo', () => {
      expect(() => verificarDueno(propietario, 5, 'msg')).not.toThrow();
    });

    it('el Propietario recibe 403 si el recurso es de otro', () => {
      expect(() => verificarDueno(propietario, 7, 'no es tuyo')).toThrow(
        ForbiddenException,
      );
    });
  });
});
