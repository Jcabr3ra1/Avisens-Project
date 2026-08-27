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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/roles';
import { MantenimientoRepuestoService } from './mantenimiento-repuesto.service';
import { CreateMantenimientoRepuestoDto } from './dto/create-mantenimiento-repuesto.dto';
import { UpdateMantenimientoRepuestoDto } from './dto/update-mantenimiento-repuesto.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

@ApiTags('mantenimientos-repuestos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('mantenimientos-repuestos')
export class MantenimientosRepuestosController {
  constructor(
    private readonly mantenimientoRepuestoService: MantenimientoRepuestoService,
  ) {}

  @Post()
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Registrar un repuesto utilizado en un mantenimiento (solo Admin)',
  })
  crear(@Body() dto: CreateMantenimientoRepuestoDto) {
    return this.mantenimientoRepuestoService.crear(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar repuestos de mantenimiento paginado (Admin y Propietario)',
  })
  listar(@Query() paginacion: PaginationQueryDto) {
    return this.mantenimientoRepuestoService.listar(paginacion);
  }

  @Get('mantenimiento/:mantenimientoId')
  @ApiOperation({
    summary: 'Listar los repuestos utilizados en un mantenimiento específico',
  })
  listarPorMantenimiento(
    @Param('mantenimientoId', ParseIntPipe) mantenimientoId: number,
    @Query() paginacion: PaginationQueryDto,
  ) {
    return this.mantenimientoRepuestoService.listarPorMantenimiento(
      mantenimientoId,
      paginacion,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un repuesto de mantenimiento por ID' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.mantenimientoRepuestoService.obtener(id);
  }

  @Patch(':id')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar un repuesto de mantenimiento (solo Admin)' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMantenimientoRepuestoDto,
  ) {
    return this.mantenimientoRepuestoService.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Eliminar de forma permanente un repuesto de mantenimiento (solo Admin)',
  })
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return (
      this.mantenimientoRepuestoService as unknown as {
        eliminar?: (id: number) => unknown;
      }
    ).eliminar?.(id);
  }
}
