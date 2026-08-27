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
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { Permisos } from '../../common/decorators/permisos.decorator';
import { PERMISOS } from '../../common/auth/permisos';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

@ApiTags('proveedores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermisosGuard)
@Permisos(PERMISOS.PROVEEDORES_LEER)
@Controller('proveedores')
export class ProveedoresController {
  constructor(private proveedoresService: ProveedoresService) {}

  @Post()
  @Permisos(PERMISOS.PROVEEDORES_GESTIONAR)
  @ApiOperation({ summary: 'Crear un proveedor (solo Admin)' })
  crear(@Body() dto: CreateProveedorDto) {
    return this.proveedoresService.crear(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar proveedores paginado (Admin y Propietario)',
  })
  listar(@Query() paginacion: PaginationQueryDto) {
    return this.proveedoresService.listar(paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un proveedor por ID' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.proveedoresService.obtener(id);
  }

  @Patch(':id')
  @Permisos(PERMISOS.PROVEEDORES_GESTIONAR)
  @ApiOperation({ summary: 'Actualizar un proveedor (solo Admin)' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProveedorDto,
  ) {
    return this.proveedoresService.actualizar(id, dto);
  }

  @Patch(':id/activar')
  @Permisos(PERMISOS.PROVEEDORES_GESTIONAR)
  @ApiOperation({ summary: 'Activar un proveedor (solo Admin)' })
  activar(@Param('id', ParseIntPipe) id: number) {
    return this.proveedoresService.activar(id);
  }

  @Delete(':id')
  @Permisos(PERMISOS.PROVEEDORES_GESTIONAR)
  @ApiOperation({
    summary: 'Desactivar un proveedor (borrado suave, solo Admin)',
  })
  desactivar(@Param('id', ParseIntPipe) id: number) {
    return this.proveedoresService.desactivar(id);
  }

  @Delete(':id/permanente')
  @Permisos(PERMISOS.PROVEEDORES_GESTIONAR)
  @ApiOperation({ summary: 'Eliminar un proveedor permanente (solo Admin)' })
  eliminarPermanente(@Param('id', ParseIntPipe) id: number) {
    return this.proveedoresService.eliminarPermanente(id);
  }
}
