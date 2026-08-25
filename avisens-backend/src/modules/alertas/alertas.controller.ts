// alertas.controller.ts
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
import { AlertasService } from './alertas.service';
import { CreateAlertasDto } from './dto/create-alertas.dto';
import { UpdateAlertasDto } from './dto/update-alertas.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string; organizacion_id?: number };
}

@ApiTags('alertas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('alertas')
export class AlertasController {
  constructor(private alertasService: AlertasService) {}

  // ============================================================
  // CRUD BÁSICO
  // ============================================================

  @Post()
  @ApiOperation({ summary: 'Crear una nueva alerta' })
  crear(@Body() dto: CreateAlertasDto, @Req() req: AuthRequest) {
    return this.alertasService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar alertas paginado (Admin: todas · Propietario: sus granjas)',
  })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.alertasService.listar(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una alerta por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.alertasService.obtener(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una alerta' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAlertasDto,
    @Req() req: AuthRequest,
  ) {
    return this.alertasService.actualizar(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una alerta permanentemente' })
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.alertasService.eliminar(id, req.user);
  }

  // ============================================================
  // ACCIONES ESPECÍFICAS
  // ============================================================

  @Patch(':id/aceptar')
  @ApiOperation({ summary: 'Aceptar una alerta (asignarse como responsable)' })
  aceptar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.alertasService.aceptar(id, req.user);
  }

  @Patch(':id/cerrar')
  @ApiOperation({ summary: 'Cerrar una alerta con acción correctiva' })
  cerrar(
    @Param('id', ParseIntPipe) id: number,
    @Body('accion_correctiva') accion_correctiva: string,
    @Req() req: AuthRequest,
  ) {
    return this.alertasService.cerrar(id, { accion_correctiva }, req.user);
  }

  @Patch(':id/escalar/:usuarioId')
  @ApiOperation({ summary: 'Escalar una alerta a otro usuario' })
  escalar(
    @Param('id', ParseIntPipe) id: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Req() req: AuthRequest,
  ) {
    return this.alertasService.escalar(id, usuarioId, req.user);
  }

  // ============================================================
  // FILTROS POR RELACIÓN
  // ============================================================

  @Get('galpon/:galponId')
  @ApiOperation({ summary: 'Obtener alertas de un galpón específico' })
  obtenerPorGalpon(
    @Param('galponId', ParseIntPipe) galponId: number,
    @Query() paginacion: PaginationQueryDto,
    @Req() req: AuthRequest,
  ) {
    return this.alertasService.obtenerPorGalpon(galponId, req.user, paginacion);
  }

  @Get('lote/:loteId')
  @ApiOperation({ summary: 'Obtener alertas de un lote específico' })
  obtenerPorLote(
    @Param('loteId', ParseIntPipe) loteId: number,
    @Query() paginacion: PaginationQueryDto,
    @Req() req: AuthRequest,
  ) {
    return this.alertasService.obtenerPorLote(loteId, req.user, paginacion);
  }

  // ============================================================
  // ESTADÍSTICAS
  // ============================================================

  @Get('estadisticas/resumen')
  @ApiOperation({ summary: 'Obtener estadísticas de alertas' })
  obtenerEstadisticas(@Req() req: AuthRequest) {
    return this.alertasService.obtenerEstadisticas(req.user);
  }
}
