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
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

@ApiTags('proveedores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
// Por defecto (lecturas): Admin y Propietario. Las escrituras las restringe
// cada método a Administrador con @Roles (que sobreescribe al de la clase).
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('proveedores')
export class ProveedoresController {
  constructor(private proveedoresService: ProveedoresService) {}

  @Post()
  @Roles(ROLES.ADMINISTRADOR)
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
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar un proveedor (solo Admin)' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProveedorDto,
  ) {
    return this.proveedoresService.actualizar(id, dto);
  }

  @Patch(':id/activar')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({ summary: 'Activar un proveedor (solo Admin)' })
  activar(@Param('id', ParseIntPipe) id: number) {
    return this.proveedoresService.activar(id);
  }

  @Delete(':id')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Desactivar un proveedor (borrado suave, solo Admin)',
  })
  desactivar(@Param('id', ParseIntPipe) id: number) {
    return this.proveedoresService.desactivar(id);
  }

  @Delete(':id/permanente')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({ summary: 'Eliminar un proveedor permanente (solo Admin)' })
  eliminarPermanente(@Param('id', ParseIntPipe) id: number) {
    return this.proveedoresService.eliminarPermanente(id);
  }
}
