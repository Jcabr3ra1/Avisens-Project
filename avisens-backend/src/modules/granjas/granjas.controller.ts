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
import { GranjasService } from './granjas.service';
import { CreateGranjaDto } from './dto/create-granja.dto';
import { UpdateGranjaDto } from './dto/update-granja.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string };
}

@ApiTags('granjas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO, ROLES.OPERARIO)
@Controller('granjas')
export class GranjasController {
  constructor(private granjasService: GranjasService) {}

  @Post()
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({ summary: 'Crear una granja para un propietario' })
  crear(@Body() dto: CreateGranjaDto, @Req() req: AuthRequest) {
    return this.granjasService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar granjas paginado (Admin: todas · Propietario: las suyas)',
  })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.granjasService.listar(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una granja por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.granjasService.obtener(id, req.user);
  }

  @Patch(':id')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar una granja' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGranjaDto,
    @Req() req: AuthRequest,
  ) {
    return this.granjasService.actualizar(id, dto, req.user);
  }

  @Patch(':id/activar')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({ summary: 'Activar una granja' })
  activar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.granjasService.activar(id, req.user);
  }

  @Delete(':id')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({ summary: 'Desactivar una granja (borrado suave)' })
  desactivar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.granjasService.desactivar(id, req.user);
  }

  @Delete(':id/permanente')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Eliminar una granja de forma permanente (casos legales) — sólo Administrador',
  })
  eliminarPermanente(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ) {
    return this.granjasService.eliminarPermanente(id, req.user);
  }
}
