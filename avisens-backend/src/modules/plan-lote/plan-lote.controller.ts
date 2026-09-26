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
import { PlanLoteService } from './plan-lote.service';
import { CrearPlanLoteDto } from './dto/crear-plan-lote.dto';
import { RecalcularPlanLoteDto } from './dto/recalcular-plan-lote.dto';
import {
  PlanLoteHistorialPaginadoDto,
  PlanLoteRespuestaDto,
} from './dto/plan-lote-respuesta.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string };
}

@ApiTags('plan-lote')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO, ROLES.OPERARIO)
@Controller('lotes')
export class PlanLoteController {
  constructor(private servicio: PlanLoteService) {}

  @Post(':id/plan')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @ApiOperation({
    summary: 'Crear o cambiar el objetivo comercial del plan de un lote',
  })
  @ApiCreatedResponse({ type: PlanLoteRespuestaDto })
  crear(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CrearPlanLoteDto,
    @Req() req: AuthRequest,
  ) {
    return this.servicio.crear(id, dto, req.user);
  }

  @Get(':id/plan')
  @ApiOperation({ summary: 'Obtener el plan vigente de un lote' })
  @ApiOkResponse({ type: PlanLoteRespuestaDto })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.servicio.obtener(id, req.user);
  }

  @Get(':id/plan/historial')
  @ApiOperation({
    summary: 'Historial paginado de versiones del plan de un lote',
  })
  @ApiOkResponse({ type: PlanLoteHistorialPaginadoDto })
  historial(
    @Param('id', ParseIntPipe) id: number,
    @Query() paginacion: PaginationQueryDto,
    @Req() req: AuthRequest,
  ) {
    return this.servicio.historial(id, paginacion, req.user);
  }

  @Post(':id/plan/recalcular')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @ApiOperation({
    summary: 'Recalcular el plan vigente contra el estado actual del lote',
  })
  @ApiCreatedResponse({ type: PlanLoteRespuestaDto })
  recalcular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecalcularPlanLoteDto,
    @Req() req: AuthRequest,
  ) {
    return this.servicio.recalcular(id, dto, req.user);
  }
}
