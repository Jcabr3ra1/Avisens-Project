import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/auth/roles';
import { AdminMetricasService } from './admin-metricas.service';
import { MetricasQueryDto } from './dto/metricas-query.dto';

@ApiTags('admin-metricas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR)
@Controller('admin/metricas')
export class AdminMetricasController {
  constructor(private metricasService: AdminMetricasService) {}

  @Get()
  @ApiOperation({
    summary:
      'Métricas de la plataforma: totales actuales y series diarias en hora de Colombia (solo Admin)',
  })
  obtener(@Query() query: MetricasQueryDto) {
    return this.metricasService.obtener(query.dias);
  }
}
