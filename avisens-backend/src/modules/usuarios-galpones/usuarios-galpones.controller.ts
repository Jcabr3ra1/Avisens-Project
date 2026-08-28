// usuarios-galpones.controller.ts
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
import { ROLES } from '../../common/auth/roles';
import { UsuariosGalponesService } from './usuarios-galpones.service';
import { CreateUsuarioGalponDto } from './dto/create-usuario-galpon.dto';
import { UpdateUsuarioGalponDto } from './dto/update-usuario-galpon.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string; organizacion_id?: number };
}

@ApiTags('usuarios-galpones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('usuarios-galpones')
export class UsuariosGalponesController {
  constructor(private usuariosGalponesService: UsuariosGalponesService) {}

  @Post()
  @ApiOperation({ summary: 'Asignar un usuario a un galpón' })
  crear(@Body() dto: CreateUsuarioGalponDto, @Req() req: AuthRequest) {
    return this.usuariosGalponesService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar asignaciones paginado' })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.usuariosGalponesService.listar(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una asignación por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.usuariosGalponesService.obtener(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una asignación' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioGalponDto,
    @Req() req: AuthRequest,
  ) {
    return this.usuariosGalponesService.actualizar(id, dto, req.user);
  }

  @Patch(':id/activar')
  @ApiOperation({ summary: 'Activar una asignación' })
  activar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.usuariosGalponesService.activar(id, req.user);
  }

  @Patch(':id/desactivar')
  @ApiOperation({ summary: 'Desactivar una asignación' })
  desactivar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.usuariosGalponesService.desactivar(id, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una asignación' })
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.usuariosGalponesService.eliminar(id, req.user);
  }

  @Get('usuario/:usuarioId')
  @ApiOperation({ summary: 'Obtener asignaciones por usuario' })
  obtenerPorUsuario(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Query() paginacion: PaginationQueryDto,
    @Req() req: AuthRequest,
  ) {
    return this.usuariosGalponesService.obtenerPorUsuario(
      usuarioId,
      req.user,
      paginacion,
    );
  }

  @Get('galpon/:galponId')
  @ApiOperation({ summary: 'Obtener asignaciones por galpón' })
  obtenerPorGalpon(
    @Param('galponId', ParseIntPipe) galponId: number,
    @Query() paginacion: PaginationQueryDto,
    @Req() req: AuthRequest,
  ) {
    return this.usuariosGalponesService.obtenerPorGalpon(
      galponId,
      req.user,
      paginacion,
    );
  }
}
