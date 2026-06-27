import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@ApiTags('usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Administrador')
@Controller('usuarios')
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un usuario (solo Admin)' })
  crear(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.crear(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los usuarios (solo Admin)' })
  listar() {
    return this.usuariosService.listar();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un usuario por ID (solo Admin)' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.obtener(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un usuario (solo Admin)' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioDto,
  ) {
    return this.usuariosService.actualizar(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un usuario (solo Admin)' })
  desactivar(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.desactivar(id);
  }
}
