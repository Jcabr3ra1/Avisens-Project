import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/auth/roles';
import { PrediccionesService } from './predicciones.service';
import { CurvaCrecimientoService } from './curva-crecimiento.service';
import { RiesgoCalorService } from './riesgo-calor.service';
import { HistorialPrediccionesDto } from './dto/historial-predicciones.dto';

interface AuthRequest extends Request {
  user: { id: number; email?: string | null; rol: string };
}

@ApiTags('predicciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO, ROLES.OPERARIO)
@Controller('predicciones')
export class PrediccionesController {
  constructor(
    private prediccionesService: PrediccionesService,
    private curvaCrecimientoService: CurvaCrecimientoService,
    private riesgoCalorService: RiesgoCalorService,
  ) {}

  @Post('lote/:loteId')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @ApiOperation({
    summary:
      'Generar una prediccion y dejarla registrada (una fila por magnitud proyectada)',
  })
  generar(
    @Param('loteId', ParseIntPipe) loteId: number,
    @Req() req: AuthRequest,
  ) {
    return this.prediccionesService.predecir(loteId, req.user, true);
  }

  @Get('lote/:loteId/historial')
  @ApiOperation({
    summary: 'Historial de predicciones guardadas de un lote',
  })
  historial(
    @Param('loteId', ParseIntPipe) loteId: number,
    @Query() query: HistorialPrediccionesDto,
    @Req() req: AuthRequest,
  ) {
    return this.prediccionesService.historial(
      loteId,
      req.user,
      query,
      query.tipo,
    );
  }

  @Get('lote/:loteId/curva-crecimiento')
  @ApiOperation({
    summary:
      'Curva de crecimiento Gompertz del lote con banda de confianza, comparada contra su curva genética',
  })
  curvaCrecimiento(
    @Param('loteId', ParseIntPipe) loteId: number,
    @Req() req: AuthRequest,
  ) {
    return this.curvaCrecimientoService.calcular(loteId, req.user);
  }

  @Get('galpon/:galponId/riesgo-calor')
  @ApiOperation({
    summary:
      'Riesgo de estrés por calor del galpón en las próximas 72 horas (índice THI)',
  })
  riesgoCalor(
    @Param('galponId', ParseIntPipe) galponId: number,
    @Req() req: AuthRequest,
  ) {
    return this.riesgoCalorService.calcular(galponId, req.user);
  }

  @Get(':loteId')
  @ApiOperation({
    summary:
      'Predecir peso a faena y dias al objetivo, SIN guardar (usa POST para dejar registro)',
  })
  predecir(
    @Param('loteId', ParseIntPipe) loteId: number,
    @Req() req: AuthRequest,
  ) {
    return this.prediccionesService.predecir(loteId, req.user);
  }
}
