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
import { CatalogoSensoresService } from './catalogo-sensores.service';
import { CreateCatalogoSensorDto } from './dto/create-catalogo-sensor.dto';
import { UpdateCatalogoSensorDto } from './dto/update-catalogo-sensor.dto';

@ApiTags('catalogo-sensores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermisosGuard)
@Permisos(PERMISOS.CATALOGOS_LEER)
@Controller('catalogo-sensores')
export class CatalogoSensoresController {
  constructor(private servicio: CatalogoSensoresService) {}

  @Post()
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  crear(@Body() dto: CreateCatalogoSensorDto) {
    return this.servicio.crear(dto);
  }

  @Get()
  listar(@Query() query: PaginationQueryDto) {
    return this.servicio.listar(query);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.obtener(id);
  }

  @Patch(':id')
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCatalogoSensorDto,
  ) {
    return this.servicio.actualizar(id, dto);
  }

  @Patch(':id/activar')
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  activar(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.cambiarEstado(id, true);
  }

  @Delete(':id')
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiOperation({ summary: 'Desactivar un sensor del catálogo' })
  desactivar(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.cambiarEstado(id, false);
  }
}
