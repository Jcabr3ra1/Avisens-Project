import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  EstadoAccionamiento,
  EstadoAlerta,
  EstadoDispositivo,
  EstadoLote,
  EstadoOrdenCompra,
  EstadoProspecto,
  EstadoRecomendacion,
  EstadoSensor,
} from '@prisma/client';
import { CreateAccionamientoEquipoDto } from '../modules/accionamientos-equipos/dto/create-accionamientos-equipos.dto';
import { UpdateAccionamientoEquipoDto } from '../modules/accionamientos-equipos/dto/update-accionamientos-equipos.dto';
import { UpdateAlertasDto } from '../modules/alertas/dto/update-alertas.dto';
import { UpdateLoteDto } from '../modules/lotes/dto/update-lote.dto';
import { CreateOrdenesCompraDto } from '../modules/ordenes-compra/dto/create-ordenes-compra.dto';
import { ListarProspectosDto } from '../modules/prospectos/dto/listar-prospectos.dto';
import { UpdateSensorDto } from '../modules/sensores/dto/update-sensor.dto';

type ClaseDto<T extends object> = new () => T;

const camposRequeridos = (cls: ClaseDto<object>): Record<string, unknown> => {
  if (cls === CreateOrdenesCompraDto) {
    return { proveedor_id: 1, codigo: 'OC-2026-001', usuario_id: 1 };
  }
  if (cls === CreateAccionamientoEquipoDto) {
    return { equipo_id: 1 };
  }
  return {};
};

const validarDto = <T extends object>(
  cls: ClaseDto<T>,
  datos: Record<string, unknown>,
) => {
  const instancia = plainToInstance(cls, { ...camposRequeridos(cls), ...datos });
  return validate(instancia);
};

const erroresDePropiedad = (errores: Array<{ property: string }>, propiedad: string) =>
  errores.filter((e) => e.property === propiedad);

describe('DTOs de estado sincronizados con enums de PostgreSQL', () => {
  describe('ListarProspectosDto', () => {
    it('acepta todos los estados que el sistema puede escribir', async () => {
      for (const estado of Object.values(EstadoProspecto)) {
        const errores = await validarDto(ListarProspectosDto, { estado });
        expect(errores).toHaveLength(0);
      }
    });

    it('rechaza un estado que no pertenece al enum', async () => {
      const errores = await validarDto(ListarProspectosDto, { estado: 'inventado' });
      expect(erroresDePropiedad(errores, 'estado')).toHaveLength(1);
    });

    it('acepta la ausencia del filtro de estado', async () => {
      const errores = await validarDto(ListarProspectosDto, {});
      expect(errores).toHaveLength(0);
    });
  });

  describe('UpdateLoteDto', () => {
    it('acepta todos los estados que el sistema puede escribir', async () => {
      for (const estado of Object.values(EstadoLote)) {
        const errores = await validarDto(UpdateLoteDto, { estado });
        expect(errores).toHaveLength(0);
      }
    });

    it('rechaza un estado que no pertenece al enum', async () => {
      const errores = await validarDto(UpdateLoteDto, { estado: 'inventado' });
      expect(erroresDePropiedad(errores, 'estado')).toHaveLength(1);
    });

    it('acepta la ausencia del estado', async () => {
      const errores = await validarDto(UpdateLoteDto, {});
      expect(errores).toHaveLength(0);
    });
  });

  describe('UpdateAlertasDto', () => {
    it('acepta todos los estados que el sistema puede escribir', async () => {
      for (const estado of Object.values(EstadoAlerta)) {
        const errores = await validarDto(UpdateAlertasDto, { estado });
        expect(errores).toHaveLength(0);
      }
    });

    it('rechaza un estado que no pertenece al enum', async () => {
      const errores = await validarDto(UpdateAlertasDto, { estado: 'inventado' });
      expect(erroresDePropiedad(errores, 'estado')).toHaveLength(1);
    });

    it('acepta la ausencia del estado', async () => {
      const errores = await validarDto(UpdateAlertasDto, {});
      expect(errores).toHaveLength(0);
    });
  });

  describe('CreateOrdenesCompraDto', () => {
    it('acepta todos los estados que el sistema puede escribir', async () => {
      for (const estado of Object.values(EstadoOrdenCompra)) {
        const errores = await validarDto(CreateOrdenesCompraDto, { estado });
        expect(errores).toHaveLength(0);
      }
    });

    it('rechaza un estado que no pertenece al enum', async () => {
      const errores = await validarDto(CreateOrdenesCompraDto, { estado: 'inventado' });
      expect(erroresDePropiedad(errores, 'estado')).toHaveLength(1);
    });

    it('acepta la ausencia del estado', async () => {
      const errores = await validarDto(CreateOrdenesCompraDto, {});
      expect(errores).toHaveLength(0);
    });
  });

  describe('CreateAccionamientoEquipoDto', () => {
    it('acepta todos los estados que el sistema puede escribir', async () => {
      for (const estado of Object.values(EstadoAccionamiento)) {
        const errores = await validarDto(CreateAccionamientoEquipoDto, { estado });
        expect(errores).toHaveLength(0);
      }
    });

    it('rechaza un estado que no pertenece al enum', async () => {
      const errores = await validarDto(CreateAccionamientoEquipoDto, { estado: 'inventado' });
      expect(erroresDePropiedad(errores, 'estado')).toHaveLength(1);
    });

    it('acepta la ausencia del estado', async () => {
      const errores = await validarDto(CreateAccionamientoEquipoDto, {});
      expect(errores).toHaveLength(0);
    });

    it('acepta null como estado porque la columna es nullable', async () => {
      const errores = await validarDto(CreateAccionamientoEquipoDto, { estado: null });
      expect(errores).toHaveLength(0);
    });
  });

  describe('UpdateAccionamientoEquipoDto', () => {
    it('acepta todos los estados que el sistema puede escribir', async () => {
      for (const estado of Object.values(EstadoAccionamiento)) {
        const errores = await validarDto(UpdateAccionamientoEquipoDto, { estado });
        expect(errores).toHaveLength(0);
      }
    });

    it('rechaza un estado que no pertenece al enum', async () => {
      const errores = await validarDto(UpdateAccionamientoEquipoDto, { estado: 'inventado' });
      expect(erroresDePropiedad(errores, 'estado')).toHaveLength(1);
    });

    it('acepta la ausencia del estado', async () => {
      const errores = await validarDto(UpdateAccionamientoEquipoDto, {});
      expect(errores).toHaveLength(0);
    });

    it('acepta null como estado porque la columna es nullable', async () => {
      const errores = await validarDto(UpdateAccionamientoEquipoDto, { estado: null });
      expect(errores).toHaveLength(0);
    });
  });

  describe('UpdateSensorDto', () => {
    it('acepta todos los estados que el sistema puede escribir', async () => {
      for (const estado of Object.values(EstadoSensor)) {
        const errores = await validarDto(UpdateSensorDto, { estado });
        expect(errores).toHaveLength(0);
      }
    });

    it('rechaza un estado que no pertenece al enum', async () => {
      const errores = await validarDto(UpdateSensorDto, { estado: 'inventado' });
      expect(erroresDePropiedad(errores, 'estado')).toHaveLength(1);
    });

    it('acepta la ausencia del estado', async () => {
      const errores = await validarDto(UpdateSensorDto, {});
      expect(errores).toHaveLength(0);
    });
  });

  describe('Enums sin DTO de entrada', () => {
    it('EstadoDispositivo contiene los valores que la ingesta escribe', () => {
      expect(Object.values(EstadoDispositivo)).toEqual(
        expect.arrayContaining(['online', 'offline']),
      );
    });

    it('EstadoRecomendacion contiene los valores que el motor escribe', () => {
      expect(Object.values(EstadoRecomendacion)).toEqual(
        expect.arrayContaining(['pendiente', 'resuelta']),
      );
    });
  });
});
