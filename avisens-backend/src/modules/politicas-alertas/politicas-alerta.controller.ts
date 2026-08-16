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
import { ROLES } from '../../common/roles';

import { PoliticasAlertaService } from './politicas-alerta.service';
import { CreatePoliticasAlertaDto } from './dto/create-politicas-alerta.dto';
import { UpdatePoliticasAlertaDto } from './dto/update-politicas-alerta.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    rol: string;
  };
}

@ApiTags('politicas-alerta')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('politicas-alerta')
export class PoliticasAlertaController {
  constructor(
    private readonly politicasAlertaService: PoliticasAlertaService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear una politica de alerta' })
  crear(@Body() dto: CreatePoliticasAlertaDto, @Req() req: AuthRequest) {
    return this.politicasAlertaService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar políticas de alerta paginadas (Admin: todas · Propietario: las suyas)',
  })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.politicasAlertaService.listar(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una política de alerta por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.politicasAlertaService.obtener(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una política de alerta' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePoliticasAlertaDto,
    @Req() req: AuthRequest,
  ) {
    return this.politicasAlertaService.actualizar(id, dto, req.user);
  }

  @Patch(':id/activar')
  @ApiOperation({ summary: 'Activar una política de alerta' })
  activar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.politicasAlertaService.activar(id, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar una política de alerta' })
  desactivar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.politicasAlertaService.desactivar(id, req.user);
  }
}
