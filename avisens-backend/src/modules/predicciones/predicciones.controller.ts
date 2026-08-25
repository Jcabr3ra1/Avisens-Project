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
import { HistorialPrediccionesDto } from './dto/historial-predicciones.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string };
}

@ApiTags('predicciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('predicciones')
export class PrediccionesController {
  constructor(private prediccionesService: PrediccionesService) {}

  @Post('lote/:loteId')
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
