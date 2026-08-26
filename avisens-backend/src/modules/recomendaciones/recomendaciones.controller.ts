import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import { RecomendacionesService } from './recomendaciones.service';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string };
}

@ApiTags('recomendaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO, ROLES.OPERARIO)
@Controller('recomendaciones')
export class RecomendacionesController {
  constructor(private recomendacionesService: RecomendacionesService) {}

  @Post('generar/:loteId')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @ApiOperation({
    summary: 'Generar las recomendaciones de un lote segun sus KPIs',
  })
  generar(
    @Param('loteId', ParseIntPipe) loteId: number,
    @Req() req: AuthRequest,
  ) {
    return this.recomendacionesService.generar(loteId, req.user);
  }

  @Get(':loteId')
  @ApiOperation({ summary: 'Listar las recomendaciones de un lote' })
  listar(
    @Param('loteId', ParseIntPipe) loteId: number,
    @Req() req: AuthRequest,
  ) {
    return this.recomendacionesService.listar(loteId, req.user);
  }

  @Patch(':id/resolver')
  @ApiOperation({ summary: 'Marcar una recomendacion como resuelta' })
  resolver(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.recomendacionesService.resolver(id, req.user);
  }
}
