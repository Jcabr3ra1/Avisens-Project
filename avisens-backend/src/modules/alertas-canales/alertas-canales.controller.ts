// alertas-canales.controller.ts
// REVISION (Juan): hay errores de formato Prettier en este archivo. Se arreglan
// solos con:  pnpm exec eslint "src/modules/alertas-canales/**/*.ts" --fix
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import { ROLES } from '../../common/roles';
import { AlertasCanalesService } from './alertas-canales.service';
import { CreateAlertasCanalesDto } from './dto/create-alertas-canales.dto';
import { UpdateAlertasCanalesDto } from './dto/update-alertas-canales.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string; organizacion_id?: number };
}

@ApiTags('alertas-canales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('alertas-canales')
export class AlertasCanalesController {
  constructor(private alertasCanalesService: AlertasCanalesService) {}

  // ============================================================
  // CRUD BÁSICO
  // ============================================================

  @Post()
  @ApiOperation({ summary: 'Crear un canal de envío para una alerta' })
  crear(@Body() dto: CreateAlertasCanalesDto, @Req() req: AuthRequest) {
    return this.alertasCanalesService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar canales de alertas paginado (Admin: todos · Propietario: sus alertas)',
  })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.alertasCanalesService.listar(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un canal de alerta por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.alertasCanalesService.obtener(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un canal de alerta' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAlertasCanalesDto,
    @Req() req: AuthRequest,
  ) {
    return this.alertasCanalesService.actualizar(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un canal de alerta' })
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.alertasCanalesService.eliminar(id, req.user);
  }

  // ============================================================
  // ACCIONES ESPECÍFICAS POR ESTADO
  // ============================================================

  @Patch(':id/enviado')
  @ApiOperation({ summary: 'Marcar canal de alerta como enviado' })
  marcarComoEnviado(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ) {
    return this.alertasCanalesService.marcarComoEnviado(id, req.user);
  }

  @Patch(':id/fallido')
  @ApiOperation({ summary: 'Marcar canal de alerta como fallido' })
  marcarComoFallido(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ) {
    return this.alertasCanalesService.marcarComoFallido(id, req.user);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Actualizar estado de envío de un canal' })
  actualizarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body('estado') estado: string,
    @Req() req: AuthRequest,
  ) {
    return this.alertasCanalesService.actualizarEstadoEnvio(id, estado, req.user);
  }

  // ============================================================
  // FILTROS POR RELACIÓN
  // ============================================================

  @Get('alerta/:alertaId')
  @ApiOperation({ summary: 'Obtener todos los canales de una alerta específica' })
  obtenerPorAlerta(
    @Param('alertaId', ParseIntPipe) alertaId: number,
    @Query() paginacion: PaginationQueryDto,
    @Req() req: AuthRequest,
  ) {
    return this.alertasCanalesService.obtenerPorAlerta(alertaId, req.user, paginacion);
  }

  // ============================================================
  // ELIMINACIÓN MASIVA
  // ============================================================

  @Delete('alerta/:alertaId')
  @ApiOperation({ summary: 'Eliminar todos los canales de una alerta' })
  eliminarPorAlerta(
    @Param('alertaId', ParseIntPipe) alertaId: number,
    @Req() req: AuthRequest,
  ) {
    return this.alertasCanalesService.eliminarPorAlerta(alertaId, req.user);
  }

  // ============================================================
  // ESTADÍSTICAS
  // ============================================================

  @Get('estadisticas/resumen')
  @ApiOperation({ summary: 'Obtener estadísticas de canales de alerta' })
  obtenerEstadisticas(@Req() req: AuthRequest) {
    return this.alertasCanalesService.obtenerEstadisticas(req.user);
  }
}