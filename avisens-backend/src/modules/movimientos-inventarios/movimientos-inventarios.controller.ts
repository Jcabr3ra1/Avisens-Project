// movimientos-inventario.controller.ts
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
import { MovimientosInventarioService } from './movimientos-inventarios.service';
import { CreateMovimientoInventarioDto } from './dto/create-movimientos-inventarios.dto';
import { UpdateMovimientoInventarioDto } from './dto/update-movimiento-inventarios.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

interface AuthRequest extends Request {
  user: { 
    id: number; 
    email: string; 
    rol: string; 
    organizacion_id?: number;
  };
}

@ApiTags('movimientos-inventario')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('movimientos-inventario')
export class MovimientosInventarioController {
  constructor(private movimientosService: MovimientosInventarioService) {}

  // ============================================================
  // CRUD BÁSICO
  // ============================================================

  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo movimiento de inventario',
    description: 'Registra una entrada o salida de insumo. Calcula automáticamente el stock resultante.',
  })
  crear(@Body() dto: CreateMovimientoInventarioDto, @Req() req: AuthRequest) {
    return this.movimientosService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar movimientos de inventario paginado',
    description: 'Propietario: ve sus movimientos. Admin: ve todos.',
  })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.movimientosService.listar(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un movimiento de inventario por ID',
  })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.movimientosService.obtener(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar un movimiento de inventario',
    description: 'Solo permite actualizar campos no críticos: lote_id, unidad_medida, motivo, comprobante_url',
  })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMovimientoInventarioDto,
    @Req() req: AuthRequest,
  ) {
    return this.movimientosService.actualizar(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar un movimiento de inventario',
    description: '⚠️ Solo administradores. Revierte el stock automáticamente.',
  })
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.movimientosService.eliminar(id, req.user);
  }

  // ============================================================
  // FILTROS POR RELACIÓN
  // ============================================================

  @Get('insumo/:insumoId')
  @ApiOperation({
    summary: 'Obtener movimientos por insumo',
    description: 'Lista todos los movimientos de un insumo específico',
  })
  obtenerPorInsumo(
    @Param('insumoId', ParseIntPipe) insumoId: number,
    @Query() paginacion: PaginationQueryDto,
    @Req() req: AuthRequest,
  ) {
    return this.movimientosService.obtenerPorInsumo(insumoId, req.user, paginacion);
  }

  @Get('lote/:loteId')
  @ApiOperation({
    summary: 'Obtener movimientos por lote',
    description: 'Lista todos los movimientos de un lote específico',
  })
  obtenerPorLote(
    @Param('loteId', ParseIntPipe) loteId: number,
    @Query() paginacion: PaginationQueryDto,
    @Req() req: AuthRequest,
  ) {
    return this.movimientosService.obtenerPorLote(loteId, req.user, paginacion);
  }

  // ============================================================
  // ESTADÍSTICAS
  // ============================================================

  @Get('estadisticas/resumen')
  @ApiOperation({
    summary: 'Obtener estadísticas de movimientos de inventario',
    description: 'Resumen de entradas, salidas y cantidades totales',
  })
  obtenerEstadisticas(@Req() req: AuthRequest) {
    return this.movimientosService.obtenerEstadisticas(req.user);
  }
}