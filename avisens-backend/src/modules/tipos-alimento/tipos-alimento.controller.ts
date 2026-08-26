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
import { TiposAlimentoService } from './tipos-alimento.service';
import { CreateTipoAlimentoDto } from './dto/create-tipo-alimento.dto';
import { UpdateTipoAlimentoDto } from './dto/update-tipo-alimento.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

@ApiTags('tipos-alimento')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermisosGuard)
@Permisos(PERMISOS.CATALOGOS_LEER)
@Controller('tipos-alimento')
export class TiposAlimentoController {
  constructor(private tiposAlimentoService: TiposAlimentoService) {}

  @Post()
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiOperation({ summary: 'Crear un tipo de alimento (solo Admin)' })
  crear(@Body() dto: CreateTipoAlimentoDto) {
    return this.tiposAlimentoService.crear(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar tipos de alimento paginado (Admin y Propietario)',
  })
  listar(@Query() paginacion: PaginationQueryDto) {
    return this.tiposAlimentoService.listar(paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un tipo de alimento por ID' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.tiposAlimentoService.obtener(id);
  }

  @Patch(':id')
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiOperation({ summary: 'Actualizar un tipo de alimento (solo Admin)' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipoAlimentoDto,
  ) {
    return this.tiposAlimentoService.actualizar(id, dto);
  }

  @Patch(':id/activar')
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiOperation({ summary: 'Activar un tipo de alimento (solo Admin)' })
  activar(@Param('id', ParseIntPipe) id: number) {
    return this.tiposAlimentoService.activar(id);
  }

  @Delete(':id')
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiOperation({
    summary: 'Desactivar un tipo de alimento (borrado suave, solo Admin)',
  })
  desactivar(@Param('id', ParseIntPipe) id: number) {
    return this.tiposAlimentoService.desactivar(id);
  }

  @Delete(':id/permanente')
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiOperation({
    summary: 'Eliminar un tipo de alimento permanente (solo Admin)',
  })
  eliminarPermanente(@Param('id', ParseIntPipe) id: number) {
    return this.tiposAlimentoService.eliminarPermanente(id);
  }
}
