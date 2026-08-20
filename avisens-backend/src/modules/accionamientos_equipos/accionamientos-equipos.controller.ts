// accionamientos-equipos.controller.ts
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
import {AccionamientosEquiposService} from './accionamiento-equipo.service'
import { CreateAccionamientoEquipoDto } from './dto/create-accionamientos-equipos.dto';
import { UpdateAccionamientoEquipoDto } from './dto/update-accionamientos-equipos.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string; organizacion_id?: number };
}

@ApiTags('accionamientos-equipos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('accionamientos-equipos')
export class AccionamientosEquiposController {
  constructor(private accionamientosService: AccionamientosEquiposService) {}

  // ============================================================
  // CRUD BÁSICO
  // ============================================================

  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo accionamiento de equipo',
    description: 'Solo se pueden accionar equipos con es_actuador = true',
  })
  crear(@Body() dto: CreateAccionamientoEquipoDto, @Req() req: AuthRequest) {
    return this.accionamientosService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar accionamientos paginado',
  })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.accionamientosService.listar(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un accionamiento por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.accionamientosService.obtener(id, req.user);
  }

  @Patch(':id/cerrar')
  @ApiOperation({
    summary: 'Cerrar un accionamiento',
    description: 'Actualiza fecha_fin y suma horas_operacion al equipo',
  })
  cerrar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAccionamientoEquipoDto,
    @Req() req: AuthRequest,
  ) {
    return this.accionamientosService.cerrar(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un accionamiento' })
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.accionamientosService.eliminar(id, req.user);
  }

  // ============================================================
  // FILTROS POR RELACIÓN
  // ============================================================

  @Get('equipo/:equipoId')
  @ApiOperation({ summary: 'Obtener accionamientos por equipo' })
  obtenerPorEquipo(
    @Param('equipoId', ParseIntPipe) equipoId: number,
    @Query() paginacion: PaginationQueryDto,
    @Req() req: AuthRequest,
  ) {
    return this.accionamientosService.obtenerPorEquipo(equipoId, req.user, paginacion);
  }

  @Get('alerta/:alertaId')
  @ApiOperation({ summary: 'Obtener accionamientos por alerta' })
  obtenerPorAlerta(
    @Param('alertaId', ParseIntPipe) alertaId: number,
    @Query() paginacion: PaginationQueryDto,
    @Req() req: AuthRequest,
  ) {
    return this.accionamientosService.obtenerPorAlerta(alertaId, req.user, paginacion);
  }

  // ============================================================
  // ESTADÍSTICAS
  // ============================================================

  @Get('estadisticas/resumen')
  @ApiOperation({ summary: 'Obtener estadísticas de accionamientos' })
  obtenerEstadisticas(@Req() req: AuthRequest) {
    return this.accionamientosService.obtenerEstadisticas(req.user);
  }
}