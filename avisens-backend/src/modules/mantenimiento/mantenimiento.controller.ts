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
import { MantenimientoService } from './mantenimiento.service';
import { CreateMantenimientoDto } from './dto/create-mantenimiento.dto';
import { UpdateMantenimientoDto } from './dto/update-mantenimiento.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string; organizacion_id?: number };
}

@ApiTags('mantenimientos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('mantenimientos')
export class MantenimientoController {
  constructor(private mantenimientoService: MantenimientoService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar un mantenimiento' })
  create(@Body() dto: CreateMantenimientoDto, @Req() req: AuthRequest) {
    return this.mantenimientoService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar mantenimientos paginado' })
  findAll(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.mantenimientoService.findAll(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un mantenimiento por ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.mantenimientoService.findOne(String(id), req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un mantenimiento' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMantenimientoDto,
    @Req() req: AuthRequest,
  ) {
    return this.mantenimientoService.update(String(id), dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un mantenimiento' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.mantenimientoService.remove(String(id), req.user);
  }
}
