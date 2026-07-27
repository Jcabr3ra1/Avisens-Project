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
import { InsumosService } from './insumos.service';
import { CreateInsumoDto } from './dto/create-insumo.dto';
import { UpdateInsumoDto } from './dto/update-insumo.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

@ApiTags('insumos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('insumos')
export class InsumosController {
  constructor(private insumosService: InsumosService) {}

  @Post()
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({ summary: 'Crear un insumo (solo Admin)' })
  crear(@Body() dto: CreateInsumoDto) {
    return this.insumosService.crear(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar insumos paginado (Admin y Propietario)' })
  listar(@Query() paginacion: PaginationQueryDto) {
    return this.insumosService.listar(paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un insumo por ID' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.insumosService.obtener(id);
  }

  @Patch(':id')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar un insumo (solo Admin)' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInsumoDto,
  ) {
    return this.insumosService.actualizar(id, dto);
  }

  @Patch(':id/activar')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({ summary: 'Activar un insumo (solo Admin)' })
  activar(@Param('id', ParseIntPipe) id: number) {
    return this.insumosService.activar(id);
  }

  @Delete(':id')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({ summary: 'Desactivar un insumo (borrado suave, solo Admin)' })
  desactivar(@Param('id', ParseIntPipe) id: number) {
    return this.insumosService.desactivar(id);
  }

  @Delete(':id/permanente')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({ summary: 'Eliminar un insumo permanente (solo Admin)' })
  eliminarPermanente(@Param('id', ParseIntPipe) id: number) {
    return this.insumosService.eliminarPermanente(id);
  }
}
