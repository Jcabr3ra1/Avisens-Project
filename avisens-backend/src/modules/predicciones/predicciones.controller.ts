import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
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

  @Get(':loteId')
  @ApiOperation({
    summary: 'Predecir peso a faena y dias al objetivo de un lote',
  })
  predecir(
    @Param('loteId', ParseIntPipe) loteId: number,
    @Req() req: AuthRequest,
  ) {
    return this.prediccionesService.predecir(loteId, req.user);
  }
}
