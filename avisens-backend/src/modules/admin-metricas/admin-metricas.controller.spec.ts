import { GUARDS_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/auth/roles';
import { AdminMetricasController } from './admin-metricas.controller';
import { MetricasQueryDto } from './dto/metricas-query.dto';

describe('AdminMetricasController (autorización y validación)', () => {
  it('protege la ruta con JWT y roles', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AdminMetricasController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
  });

  it('exige rol Administrador', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminMetricasController)).toEqual([
      ROLES.ADMINISTRADOR,
    ]);
  });

  const validar = async (dias: unknown) =>
    validate(
      plainToInstance(MetricasQueryDto, dias === undefined ? {} : { dias }),
    );

  it('usa 30 por defecto', async () => {
    const dto = plainToInstance(MetricasQueryDto, {});
    expect(dto.dias).toBe(30);
    expect(await validar(undefined)).toHaveLength(0);
  });

  it.each(['7', '30', '90'])('acepta dias=%s', async (valor) => {
    expect(await validar(valor)).toHaveLength(0);
  });

  it.each(['1', '15', '365', 'abc', '0'])('rechaza dias=%s', async (valor) => {
    expect(await validar(valor)).not.toHaveLength(0);
  });
});
