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
import { ClimaService } from './clima.service';
import { Solicitante } from '../../common/auth/acceso';

interface AuthRequest extends Request {
  user: Solicitante;
}

@ApiTags('clima')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO, ROLES.OPERARIO)
@Controller('granjas/:granjaId/clima')
export class ClimaController {
  constructor(private readonly clima: ClimaService) {}

  @Get()
  @ApiOperation({ summary: 'Ultimas 48 lecturas de clima de una granja' })
  listar(
    @Param('granjaId', ParseIntPipe) granjaId: number,
    @Req() req: AuthRequest,
  ) {
    return this.clima.listar(granjaId, req.user);
  }

  @Post('traer')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Traer y guardar el clima de una granja ahora mismo',
  })
  traerAhora(
    @Param('granjaId', ParseIntPipe) granjaId: number,
    @Req() req: AuthRequest,
  ) {
    return this.clima.traerAhora(granjaId, req.user);
  }
}
