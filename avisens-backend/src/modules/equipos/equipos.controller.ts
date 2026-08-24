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
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { EquiposService } from './equipos.service';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';

@ApiTags('equipos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('equipos')
export class EquiposController {
  constructor(private equiposService: EquiposService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar un equipo en un galpón' })
  crear(@Body() dto: CreateEquipoDto) {
    return this.equiposService.crear(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar equipos paginados' })
  listar(@Query() paginacion: PaginationQueryDto) {
    return this.equiposService.listar(paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un equipo por ID' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.equiposService.obtener(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un equipo' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEquipoDto,
  ) {
    return this.equiposService.actualizar(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un equipo' })
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.equiposService.eliminar(id);
  }
}
