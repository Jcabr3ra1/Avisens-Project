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
import { GalponesService } from './galpones.service';
import { CreateGalponDto } from './dto/create-galpon.dto';
import { UpdateGalponDto } from './dto/update-galpon.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string };
}

@ApiTags('galpones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('galpones')
export class GalponesController {
  constructor(private galponesService: GalponesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un galpón en una granja' })
  crear(@Body() dto: CreateGalponDto, @Req() req: AuthRequest) {
    return this.galponesService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar galpones paginado (Admin: todos · Propietario: los de sus granjas)',
  })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.galponesService.listar(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un galpón por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.galponesService.obtener(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un galpón' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGalponDto,
    @Req() req: AuthRequest,
  ) {
    return this.galponesService.actualizar(id, dto, req.user);
  }

  @Patch(':id/activar')
  @ApiOperation({ summary: 'Activar un galpón' })
  activar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.galponesService.activar(id, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un galpón (borrado suave)' })
  desactivar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.galponesService.desactivar(id, req.user);
  }

  @Delete(':id/permanente')
  @ApiOperation({
    summary: 'Eliminar un galpón de forma permanente (casos legales)',
  })
  eliminarPermanente(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ) {
    return this.galponesService.eliminarPermanente(id, req.user);
  }
}
