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
import { ROLES } from '../../common/auth/roles';
import { TiposAlimentoService } from './tipos-alimento.service';
import { CreateTipoAlimentoDto } from './dto/create-tipo-alimento.dto';
import { UpdateTipoAlimentoDto } from './dto/update-tipo-alimento.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

@ApiTags('tipos-alimento')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('tipos-alimento')
export class TiposAlimentoController {
  constructor(private tiposAlimentoService: TiposAlimentoService) {}

  @Post()
  @Roles(ROLES.ADMINISTRADOR)
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
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar un tipo de alimento (solo Admin)' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipoAlimentoDto,
  ) {
    return this.tiposAlimentoService.actualizar(id, dto);
  }

  @Patch(':id/activar')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({ summary: 'Activar un tipo de alimento (solo Admin)' })
  activar(@Param('id', ParseIntPipe) id: number) {
    return this.tiposAlimentoService.activar(id);
  }

  @Delete(':id')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Desactivar un tipo de alimento (borrado suave, solo Admin)',
  })
  desactivar(@Param('id', ParseIntPipe) id: number) {
    return this.tiposAlimentoService.desactivar(id);
  }

  @Delete(':id/permanente')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Eliminar un tipo de alimento permanente (solo Admin)',
  })
  eliminarPermanente(@Param('id', ParseIntPipe) id: number) {
    return this.tiposAlimentoService.eliminarPermanente(id);
  }
}
