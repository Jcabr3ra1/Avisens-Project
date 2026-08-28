import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/auth/roles';
import { IndicadoresService } from './indicadores.service';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string };
}

@ApiTags('indicadores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO, ROLES.OPERARIO)
@Controller('indicadores')
export class IndicadoresController {
  constructor(private indicadoresService: IndicadoresService) {}

  @Post('calcular/:loteId')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @ApiOperation({
    summary: 'Calcular y guardar los indicadores de hoy de un lote',
  })
  calcular(
    @Param('loteId', ParseIntPipe) loteId: number,
    @Req() req: AuthRequest,
  ) {
    return this.indicadoresService.calcular(loteId, req.user);
  }

  @Get(':loteId/comparacion')
  @ApiOperation({
    summary: 'Comparar el ultimo indicador del lote contra la curva objetivo',
  })
  comparar(
    @Param('loteId', ParseIntPipe) loteId: number,
    @Req() req: AuthRequest,
  ) {
    return this.indicadoresService.compararConCurva(loteId, req.user);
  }

  @Get(':loteId/finanzas')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @ApiOperation({
    summary: 'KPIs financieros del lote (costo/kg, margen, ROI)',
  })
  kpisFinancieros(
    @Param('loteId', ParseIntPipe) loteId: number,
    @Req() req: AuthRequest,
  ) {
    return this.indicadoresService.kpisFinancieros(loteId, req.user);
  }

  @Post(':loteId/alerta-desvio')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Generar la alerta de desvio del lote ahora (si va por debajo)',
  })
  generarAlertaDesvio(@Param('loteId', ParseIntPipe) loteId: number) {
    return this.indicadoresService.generarAlertaDesvio(loteId);
  }

  @Get(':loteId')
  @ApiOperation({ summary: 'Listar el historico de indicadores de un lote' })
  listar(
    @Param('loteId', ParseIntPipe) loteId: number,
    @Req() req: AuthRequest,
  ) {
    return this.indicadoresService.listar(loteId, req.user);
  }
}
