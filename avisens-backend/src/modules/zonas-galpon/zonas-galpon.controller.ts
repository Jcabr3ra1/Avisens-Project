// zonas-galpon.controller.ts
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
import { ZonasGalponService } from './zonas-galpon.service';
import { CreateZonaGalponDto } from './dto/create-zona-galpon.dto';
import { UpdateZonaGalponDto } from './dto/update-zona-galpon.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string; organizacion_id?: number };
}

@ApiTags('zonas-galpon')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('zonas-galpon')
export class ZonasGalponController {
  constructor(private zonasService: ZonasGalponService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva zona en un galpón' })
  crear(@Body() dto: CreateZonaGalponDto, @Req() req: AuthRequest) {
    return this.zonasService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar zonas paginado' })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.zonasService.listar(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una zona por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.zonasService.obtener(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una zona' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateZonaGalponDto,
    @Req() req: AuthRequest,
  ) {
    return this.zonasService.actualizar(id, dto, req.user);
  }

  @Patch(':id/activar')
  @ApiOperation({ summary: 'Activar una zona' })
  activar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.zonasService.activar(id, req.user);
  }

  @Patch(':id/desactivar')
  @ApiOperation({ summary: 'Desactivar una zona' })
  desactivar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.zonasService.desactivar(id, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una zona' })
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.zonasService.eliminar(id, req.user);
  }

  @Get('galpon/:galponId')
  @ApiOperation({ summary: 'Obtener zonas por galpón' })
  obtenerPorGalpon(
    @Param('galponId', ParseIntPipe) galponId: number,
    @Query() paginacion: PaginationQueryDto,
    @Req() req: AuthRequest,
  ) {
    return this.zonasService.obtenerPorGalpon(galponId, req.user, paginacion);
  }
}
