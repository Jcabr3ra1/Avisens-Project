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
import { DispositivosService } from './dispositivos.service';
import { CreateDispositivoDto } from './dto/create-dispositivo.dto';
import { UpdateDispositivoDto } from './dto/update-dispositivo.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    rol: string;
  };
}

@ApiTags('dispositivos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('dispositivos')
export class DispositivosController {
  constructor(private dispositivosService: DispositivosService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar un dispositivo (ESP32) en galpon' })
  crear(@Body() dto: CreateDispositivoDto, @Req() req: AuthRequest) {
    return this.dispositivosService.crear(dto, req.user);
  }
  @Get()
  @ApiOperation({
    summary:
      'Listar dispositivos paginado (Admin: todos - Propietario: los de sus galpones)',
  })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.dispositivosService.listar(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un dispositivo por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.dispositivosService.obtener(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un dispositivo' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDispositivoDto,
    @Req() req: AuthRequest,
  ) {
    return this.dispositivosService.actualizar(id, dto, req.user);
  }

  @Patch(':id/activar')
  @ApiOperation({ summary: 'Activar un dispositivo' })
  activar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.dispositivosService.activar(id, req.user);
  }

  @Post(':id/token')
  @ApiOperation({
    summary: 'Regenerar y revelar el token de ingesta del dispositivo',
  })
  regenerarToken(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ) {
    return this.dispositivosService.regenerarToken(id, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un dispositivo (borrado suave)' })
  desactivar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.dispositivosService.desactivar(id, req.user);
  }

  @Delete(':id/permanente')
  @ApiOperation({
    summary: 'Eliminar un dispositivo de forma permanente (casos legales)',
  })
  eliminarPermanente(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ) {
    return this.dispositivosService.eliminarPermanente(id, req.user);
  }
}
