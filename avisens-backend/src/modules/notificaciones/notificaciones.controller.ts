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
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { NotificacionesService } from './notificaciones.service';
import { CreateNotificacionDto } from './dto/create-notificacion.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string };
}

@ApiTags('notificaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR)
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private service: NotificacionesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una notificación para un usuario' })
  crear(@Body() dto: CreateNotificacionDto) {
    return this.service.crear(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar mis notificaciones (paginadas)' })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.service.listar(req.user.id, paginacion);
  }

  @Get('no-leidas')
  @ApiOperation({ summary: 'Contar notificaciones no leídas' })
  contarNoLeidas(@Req() req: AuthRequest) {
    return this.service.contarNoLeidas(req.user.id);
  }

  @Patch(':id/leer')
  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  marcarLeida(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.marcarLeida(id, req.user.id);
  }

  @Patch('leer-todas')
  @ApiOperation({ summary: 'Marcar todas mis notificaciones como leídas' })
  marcarTodasLeidas(@Req() req: AuthRequest) {
    return this.service.marcarTodasLeidas(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una notificación' })
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.eliminar(id, req.user.id);
  }
}
