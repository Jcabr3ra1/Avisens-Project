import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/auth/roles';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { ZonasGalponService } from './zonas-galpon.service';
import { CreateZonaGalponDto } from './dto/create-zona-galpon.dto';
import { UpdateZonaGalponDto } from './dto/update-zona-galpon.dto';

@ApiTags('zonas-galpon')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('zonas-galpon')
export class ZonasGalponController {
  constructor(private service: ZonasGalponService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una zona dentro de un galpón' })
  crear(@Body() dto: CreateZonaGalponDto) { return this.service.crear(dto); }

  @Get()
  @ApiOperation({ summary: 'Listar zonas paginadas' })
  listar(@Query() paginacion: PaginationQueryDto) { return this.service.listar(paginacion); }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una zona por ID' })
  obtener(@Param('id', ParseIntPipe) id: number) { return this.service.obtener(id); }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una zona' })
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateZonaGalponDto) {
    return this.service.actualizar(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una zona' })
  eliminar(@Param('id', ParseIntPipe) id: number) { return this.service.eliminar(id); }
}
