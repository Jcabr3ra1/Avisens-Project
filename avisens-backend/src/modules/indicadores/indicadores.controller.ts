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
import { ROLES } from '../../common/roles';
import { IndicadoresService } from './indicadores.service';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string };
}

@ApiTags('indicadores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('indicadores')
export class IndicadoresController {
  constructor(private indicadoresService: IndicadoresService) {}

  @Post('calcular/:loteId')
  @ApiOperation({
    summary: 'Calcular y guardar los indicadores de hoy de un lote',
  })
  calcular(
    @Param('loteId', ParseIntPipe) loteId: number,
    @Req() req: AuthRequest,
  ) {
    return this.indicadoresService.calcular(loteId, req.user);
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
