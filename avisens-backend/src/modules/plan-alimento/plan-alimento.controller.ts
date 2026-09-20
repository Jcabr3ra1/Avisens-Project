import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/auth/roles';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { PlanAlimentoService } from './plan-alimento.service';
import { CrearEstimacionAlimentoDto } from './dto/crear-estimacion-alimento.dto';
import {
  EstimacionAlimentoHistorialPaginadoDto,
  EstimacionAlimentoRespuestaDto,
} from './dto/estimacion-alimento-respuesta.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string };
}

@ApiTags('plan-alimento')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO, ROLES.OPERARIO)
@Controller('lotes')
export class PlanAlimentoController {
  constructor(private servicio: PlanAlimentoService) {}

  @Post(':id/plan/alimento')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @ApiOperation({
    summary:
      'Calcular o recalcular la estimación de alimento del plan vigente de un lote',
  })
  @ApiCreatedResponse({ type: EstimacionAlimentoRespuestaDto })
  crear(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CrearEstimacionAlimentoDto,
    @Req() req: AuthRequest,
  ) {
    return this.servicio.crear(id, dto, req.user);
  }

  @Get(':id/plan/alimento')
  @ApiOperation({
    summary: 'Obtener la estimación de alimento más reciente de un lote',
  })
  @ApiOkResponse({ type: EstimacionAlimentoRespuestaDto })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.servicio.obtener(id, req.user);
  }

  @Get(':id/plan/alimento/historial')
  @ApiOperation({
    summary:
      'Historial paginado de estimaciones de alimento de todos los planes del lote',
  })
  @ApiOkResponse({ type: EstimacionAlimentoHistorialPaginadoDto })
  historial(
    @Param('id', ParseIntPipe) id: number,
    @Query() paginacion: PaginationQueryDto,
    @Req() req: AuthRequest,
  ) {
    return this.servicio.historial(id, paginacion, req.user);
  }
}
