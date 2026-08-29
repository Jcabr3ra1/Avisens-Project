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
import { InsumosService } from './insumos.service';
import { CreateInsumoDto } from './dto/create-insumo.dto';
import { UpdateInsumoDto } from './dto/update-insumo.dto';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    rol: string;
  };
}

@ApiTags('insumos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO, ROLES.OPERARIO)
@Controller('insumos')
export class InsumosController {
  constructor(private insumosService: InsumosService) {}

  @Post()
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({ summary: 'Crear un insumo en una granja (solo Admin)' })
  crear(@Body() dto: CreateInsumoDto, @Req() req: AuthRequest) {
    return this.insumosService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar insumos paginado (Admin: todos - Propietario: los de sus granjas)',
  })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.insumosService.listar(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un insumo por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.insumosService.obtener(id, req.user);
  }

  @Post(':id/movimientos')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO, ROLES.OPERARIO)
  @ApiOperation({
    summary:
      'Registrar un movimiento de stock (entrada, salida o ajuste) y actualizar el inventario',
  })
  registrarMovimiento(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarMovimientoDto,
    @Req() req: AuthRequest,
  ) {
    return this.insumosService.registrarMovimiento(id, dto, req.user);
  }

  @Get(':id/movimientos')
  @ApiOperation({ summary: 'Historial de movimientos de un insumo' })
  listarMovimientos(
    @Param('id', ParseIntPipe) id: number,
    @Query() paginacion: PaginationQueryDto,
    @Req() req: AuthRequest,
  ) {
    return this.insumosService.listarMovimientos(id, req.user, paginacion);
  }

  @Patch(':id')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({
    summary:
      'Actualizar un insumo (solo Admin). El stock NO se toca aqui: se mueve con POST /:id/movimientos',
  })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInsumoDto,
    @Req() req: AuthRequest,
  ) {
    return this.insumosService.actualizar(id, dto, req.user);
  }

  @Patch(':id/activar')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({ summary: 'Activar un insumo (solo Admin)' })
  activar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.insumosService.activar(id, req.user);
  }

  @Delete(':id')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({ summary: 'Desactivar un insumo (borrado suave, solo Admin)' })
  desactivar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.insumosService.desactivar(id, req.user);
  }

  @Delete(':id/permanente')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({ summary: 'Eliminar un insumo permanente (solo Admin)' })
  eliminarPermanente(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ) {
    return this.insumosService.eliminarPermanente(id, req.user);
  }
}
