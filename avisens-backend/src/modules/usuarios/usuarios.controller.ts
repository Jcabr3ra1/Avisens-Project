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
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

// El usuario autenticado que adjunta la estrategia JWT.
interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string };
}

@ApiTags('usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
// Admin gestiona a todos; Propietario solo a sus operarios (el alcance se
// aplica en el servicio según el rol del solicitante).
@Roles('Administrador', 'Propietario')
@Controller('usuarios')
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un usuario (Admin: cualquiera · Propietario: operarios)' })
  crear(@Body() dto: CreateUsuarioDto, @Req() req: AuthRequest) {
    return this.usuariosService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar usuarios paginado (Admin: todos · Propietario: operarios)' })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.usuariosService.listar(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.usuariosService.obtener(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un usuario' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioDto,
    @Req() req: AuthRequest,
  ) {
    return this.usuariosService.actualizar(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un usuario (borrado suave, revoca sesiones)' })
  desactivar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.usuariosService.desactivar(id, req.user);
  }

  @Delete(':id/permanente')
  @ApiOperation({ summary: 'Eliminar un usuario de forma permanente (casos legales)' })
  eliminarPermanente(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.usuariosService.eliminarPermanente(id, req.user);
  }
}
