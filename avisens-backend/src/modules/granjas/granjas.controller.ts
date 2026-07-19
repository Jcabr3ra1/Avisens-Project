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
import { GranjasService } from './granjas.service';
import { CreateGranjaDto } from './dto/create-granja.dto';
import { UpdateGranjaDto } from './dto/update-granja.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

// El usuario autenticado que adjunta la estrategia JWT.
interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string };
}

@ApiTags('granjas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
// Admin gestiona todas; Propietario solo las suyas (el alcance se aplica en el
// servicio según el rol del solicitante).
@Roles('Administrador', 'Propietario')
@Controller('granjas')
export class GranjasController {
  constructor(private granjasService: GranjasService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una granja (Admin: para cualquier propietario · Propietario: para sí mismo)' })
  crear(@Body() dto: CreateGranjaDto, @Req() req: AuthRequest) {
    return this.granjasService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar granjas paginado (Admin: todas · Propietario: las suyas)' })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.granjasService.listar(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una granja por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.granjasService.obtener(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una granja' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGranjaDto,
    @Req() req: AuthRequest,
  ) {
    return this.granjasService.actualizar(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar una granja (borrado suave)' })
  desactivar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.granjasService.desactivar(id, req.user);
  }

  @Delete(':id/permanente')
  @ApiOperation({ summary: 'Eliminar una granja de forma permanente (casos legales)' })
  eliminarPermanente(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.granjasService.eliminarPermanente(id, req.user);
  }
}
