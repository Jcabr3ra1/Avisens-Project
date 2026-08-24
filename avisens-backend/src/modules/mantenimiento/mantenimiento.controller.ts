import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { ROLES } from '../../common/roles';
import { MantenimientoService } from './mantenimiento.service';
import { createMantenimientoDto } from './dto/create-mantenimiento.tdo';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string; organizacion_id?: number };
}

@ApiTags('mantenimiento')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('mantenimiento')
export class MantenimientoController {
  constructor(private mantenimientoService: MantenimientoService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar un mantenimiento' })
  create(@Body() dto: createMantenimientoDto, @Req() req: AuthRequest) {
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
}