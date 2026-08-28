import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/auth/roles';
import { UsuariosGalponesService } from './usuarios-galpones.service';
import { CreateUsuarioGalponDto, ListarUsuarioGalponDto } from './dto/create-usuario-galpon.dto';

@ApiTags('usuarios-galpones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR)
@Controller('usuarios-galpones')
export class UsuariosGalponesController {
  constructor(private service: UsuariosGalponesService) {}

  @Post()
  @ApiOperation({ summary: 'Asignar un usuario a un galpón' })
  crear(@Body() dto: CreateUsuarioGalponDto) { return this.service.crear(dto); }

  @Get()
  @ApiOperation({ summary: 'Listar asignaciones usuario-galpón' })
  listar(@Query() dto: ListarUsuarioGalponDto) { return this.service.listar(dto); }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una asignación por ID' })
  obtener(@Param('id', ParseIntPipe) id: number) { return this.service.obtener(id); }

  @Patch(':id/desactivar')
  @ApiOperation({ summary: 'Desactivar una asignación' })
  desactivar(@Param('id', ParseIntPipe) id: number) { return this.service.desactivar(id); }

  @Patch(':id/activar')
  @ApiOperation({ summary: 'Reactivar una asignación' })
  activar(@Param('id', ParseIntPipe) id: number) { return this.service.activar(id); }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una asignación' })
  eliminar(@Param('id', ParseIntPipe) id: number) { return this.service.eliminar(id); }
}
