import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/auth/roles';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { MovimientosInventarioService } from './movimientos-inventario.service';
import { CreateMovimientoInventarioDto } from './dto/create-movimiento-inventario.dto';

@ApiTags('movimientos-inventario')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('movimientos-inventario')
export class MovimientosInventarioController {
  constructor(private service: MovimientosInventarioService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar un movimiento de inventario (entrada/salida/ajuste)' })
  crear(@Body() dto: CreateMovimientoInventarioDto) { return this.service.crear(dto); }

  @Get()
  @ApiOperation({ summary: 'Listar movimientos de inventario paginados' })
  listar(@Query() paginacion: PaginationQueryDto) { return this.service.listar(paginacion); }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un movimiento por ID' })
  obtener(@Param('id', ParseIntPipe) id: number) { return this.service.obtener(id); }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un movimiento' })
  eliminar(@Param('id', ParseIntPipe) id: number) { return this.service.eliminar(id); }
}
