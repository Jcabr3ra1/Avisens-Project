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
import { PERMISOS } from '../../common/auth/permisos';
import { Permisos } from '../../common/decorators/permisos.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { LineasGeneticasService } from './lineas-geneticas.service';
import { CreateLineaGeneticaDto } from './dto/create-linea-genetica.dto';
import { UpdateLineaGeneticaDto } from './dto/update-linea-genetica.dto';

@ApiTags('lineas-geneticas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermisosGuard)
@Permisos(PERMISOS.CATALOGOS_LEER)
@Controller('lineas-geneticas')
export class LineasGeneticasController {
  constructor(private servicio: LineasGeneticasService) {}

  @Post()
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiOperation({ summary: 'Crear una línea genética' })
  crear(@Body() dto: CreateLineaGeneticaDto) {
    return this.servicio.crear(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar líneas genéticas paginado' })
  listar(@Query() query: PaginationQueryDto) {
    return this.servicio.listar(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una línea genética por ID' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.obtener(id);
  }

  @Patch(':id')
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiOperation({
    summary: 'Actualizar nombre/descripción (codigo es inmutable)',
  })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLineaGeneticaDto,
  ) {
    return this.servicio.actualizar(id, dto);
  }

  @Patch(':id/activar')
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiOperation({ summary: 'Reactivar una línea genética' })
  activar(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.cambiarEstado(id, true);
  }

  @Delete(':id')
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiOperation({ summary: 'Desactivar una línea genética (borrado suave)' })
  desactivar(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.cambiarEstado(id, false);
  }
}
