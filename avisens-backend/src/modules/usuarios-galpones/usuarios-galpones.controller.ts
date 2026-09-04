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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permisos } from '../../common/decorators/permisos.decorator';
import { ROLES } from '../../common/auth/roles';
import { PERMISOS } from '../../common/auth/permisos';
import { UsuariosGalponesService } from './usuarios-galpones.service';
import {
  CreateUsuarioGalponDto,
  ListarUsuarioGalponDto,
} from './dto/create-usuario-galpon.dto';

interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    rol: string;
    organizacion_id?: number | null;
  };
}

@ApiTags('usuarios-galpones')
@ApiBearerAuth()
// El operario ve quien mas trabaja en sus galpones, pero no reparte
// asignaciones: eso lo hace el propietario. Por eso la clase abre la
// lectura a los tres y cada escritura vuelve a cerrarse abajo.
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO, ROLES.OPERARIO)
@Permisos(PERMISOS.USUARIOS_LEER)
@Controller('usuarios-galpones')
export class UsuariosGalponesController {
  constructor(private service: UsuariosGalponesService) {}

  @Post()
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @Permisos(PERMISOS.USUARIOS_GESTIONAR)
  @ApiOperation({ summary: 'Asignar un usuario a un galpón' })
  crear(@Body() dto: CreateUsuarioGalponDto, @Req() req: AuthRequest) {
    return this.service.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar asignaciones usuario-galpón' })
  listar(@Query() dto: ListarUsuarioGalponDto, @Req() req: AuthRequest) {
    return this.service.listar(dto, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una asignación por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.obtener(id, req.user);
  }

  @Patch(':id/desactivar')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @Permisos(PERMISOS.USUARIOS_GESTIONAR)
  @ApiOperation({ summary: 'Desactivar una asignación' })
  desactivar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.desactivar(id, req.user);
  }

  @Patch(':id/activar')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @Permisos(PERMISOS.USUARIOS_GESTIONAR)
  @ApiOperation({ summary: 'Reactivar una asignación' })
  activar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.activar(id, req.user);
  }

  @Delete(':id')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @Permisos(PERMISOS.USUARIOS_GESTIONAR)
  @ApiOperation({
    summary: 'Desactivar una asignación conservando el historial',
  })
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.desactivar(id, req.user);
  }
}
