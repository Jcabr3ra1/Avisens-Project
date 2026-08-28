import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/auth/roles';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { ModelosMlService } from './modelos-ml.service';
import { CreateModeloMlDto } from './dto/create-modelo-ml.dto';
import { UpdateModeloMlDto } from './dto/update-modelo-ml.dto';

@ApiTags('modelos-ml')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR)
@Controller('modelos-ml')
export class ModelosMlController {
  constructor(private service: ModelosMlService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar un modelo de ML' })
  crear(@Body() dto: CreateModeloMlDto) { return this.service.crear(dto); }

  @Get()
  @ApiOperation({ summary: 'Listar modelos de ML paginados' })
  listar(@Query() paginacion: PaginationQueryDto) { return this.service.listar(paginacion); }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un modelo por ID' })
  obtener(@Param('id', ParseIntPipe) id: number) { return this.service.obtener(id); }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un modelo' })
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateModeloMlDto) {
    return this.service.actualizar(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un modelo' })
  eliminar(@Param('id', ParseIntPipe) id: number) { return this.service.eliminar(id); }
}
