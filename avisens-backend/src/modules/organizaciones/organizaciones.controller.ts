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
import { CreateOrganizacionDto } from './dto/create-organizacion.dto';
import { UpdateOrganizacionDto } from './dto/update-organizacion.dto';
import { OrganizacionesService } from './organizaciones.service';

@ApiTags('organizaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermisosGuard)
@Permisos(PERMISOS.ORGANIZACIONES_GESTIONAR)
@Controller('organizaciones')
export class OrganizacionesController {
  constructor(private organizacionesService: OrganizacionesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una organización' })
  crear(@Body() dto: CreateOrganizacionDto) {
    return this.organizacionesService.crear(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar organizaciones' })
  listar(@Query() paginacion: PaginationQueryDto) {
    return this.organizacionesService.listar(paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar una organización' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.organizacionesService.obtener(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una organización' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrganizacionDto,
  ) {
    return this.organizacionesService.actualizar(id, dto);
  }

  @Patch(':id/activar')
  @ApiOperation({ summary: 'Activar una organización' })
  activar(@Param('id', ParseIntPipe) id: number) {
    return this.organizacionesService.activar(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar una organización y revocar su acceso' })
  desactivar(@Param('id', ParseIntPipe) id: number) {
    return this.organizacionesService.desactivar(id);
  }
}
