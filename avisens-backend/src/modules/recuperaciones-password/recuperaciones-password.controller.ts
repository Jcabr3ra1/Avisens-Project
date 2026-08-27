import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/auth/roles';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { RecuperacionesPasswordService } from './recuperaciones-password.service';
import { SolicitarRecuperacionDto } from './dto/solicitar-recuperacion.dto';
import { ResolverRecuperacionDto } from './dto/resolver-recuperacion.dto';
import { CambiarPasswordTemporalDto } from './dto/cambiar-password-temporal.dto';

interface AdminRequest extends Request {
  user: { id: number };
}

interface CambioRequest extends Request {
  user: { id: number };
}

@ApiTags('recuperaciones-password')
@Controller('recuperaciones-password')
export class RecuperacionesPasswordController {
  constructor(private recuperaciones: RecuperacionesPasswordService) {}

  @Post('solicitudes')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 15 * 60 * 1000 } })
  @ApiOperation({ summary: 'Solicitar recuperación asistida de contraseña' })
  solicitar(@Body() dto: SolicitarRecuperacionDto, @Req() req: Request) {
    return this.recuperaciones.solicitar(dto.email, dto.motivo, req.ip);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMINISTRADOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar solicitudes de recuperación (solo Admin)' })
  listar(@Query() paginacion: PaginationQueryDto) {
    return this.recuperaciones.listar(paginacion);
  }

  @Patch(':id/aprobar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMINISTRADOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aprobar y generar contraseña temporal' })
  aprobar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolverRecuperacionDto,
    @Req() req: AdminRequest,
  ) {
    return this.recuperaciones.aprobar(id, req.user.id, dto.observacion);
  }

  @Patch(':id/rechazar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMINISTRADOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rechazar una solicitud (solo Admin)' })
  rechazar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolverRecuperacionDto,
    @Req() req: AdminRequest,
  ) {
    return this.recuperaciones.rechazar(id, req.user.id, dto.observacion);
  }

  @Post('cambiar-password')
  @UseGuards(AuthGuard('jwt-cambio-password'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reemplazar la contraseña temporal obligatoria' })
  cambiarPassword(
    @Body() dto: CambiarPasswordTemporalDto,
    @Req() req: CambioRequest,
  ) {
    return this.recuperaciones.cambiarPassword(req.user.id, dto.nueva_password);
  }
}
