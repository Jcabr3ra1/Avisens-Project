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
import { LotesService } from './lotes.service';
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    rol: string;
  };
}

@ApiTags('lotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO, ROLES.OPERARIO)
@Controller('lotes')
export class LotesController {
  constructor(private lotesService: LotesService) {}

  @Post()
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @ApiOperation({ summary: 'Registrar un lote en un galpon' })
  crear(@Body() dto: CreateLoteDto, @Req() req: AuthRequest) {
    return this.lotesService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar lotes paginado (Admin: todos - Propietario: los de sus galpones)',
  })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.lotesService.listar(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un lote por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.lotesService.obtener(id, req.user);
  }

  @Patch(':id')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @ApiOperation({ summary: 'Actualizar un lote' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLoteDto,
    @Req() req: AuthRequest,
  ) {
    return this.lotesService.actualizar(id, dto, req.user);
  }

  @Patch(':id/activar')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @ApiOperation({ summary: 'Activar un lote' })
  activar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.lotesService.activar(id, req.user);
  }

  @Delete(':id')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @ApiOperation({ summary: 'Desactivar un lote (borrado suave)' })
  desactivar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.lotesService.desactivar(id, req.user);
  }

  @Delete(':id/permanente')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @ApiOperation({
    summary: 'Eliminar un lote de forma permanente (casos legales)',
  })
  eliminarPermanente(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ) {
    return this.lotesService.eliminarPermanente(id, req.user);
  }
}
