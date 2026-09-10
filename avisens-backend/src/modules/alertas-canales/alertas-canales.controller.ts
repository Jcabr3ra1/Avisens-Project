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
import { ROLES } from '../../common/auth/roles';
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
    summary:
      'Listar canales de alertas paginado (Admin: todos · Propietario: sus alertas)',
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

  // Aquí vivían PATCH :id/enviado, :id/fallido y :id/estado, y no deberían
  // haber sido rutas: el estado de envío lo pone quien despacha la
  // notificación, no una persona. Que un usuario pudiera marcar "enviado" a
  // mano permitía tapar que un aviso nunca salió, y ese registro es
  // precisamente el que sirve para saber si la alerta llegó.
  //
  // Los métodos siguen en el servicio (marcarComoEnviado, marcarComoFallido,
  // actualizarEstadoEnvio) para que el despachador los llame en proceso
  // cuando exista.

  // ============================================================
  // FILTROS POR RELACIÓN
  // ============================================================

  @Get('alerta/:alertaId')
  @ApiOperation({
    summary: 'Obtener todos los canales de una alerta específica',
  })
  obtenerPorAlerta(
    @Param('alertaId', ParseIntPipe) alertaId: number,
    @Query() paginacion: PaginationQueryDto,
    @Req() req: AuthRequest,
  ) {
    return this.alertasCanalesService.obtenerPorAlerta(
      alertaId,
      req.user,
      paginacion,
    );
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
