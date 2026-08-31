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
import { ROLES } from '../../common/auth/roles';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MensajesEquipoService } from './mensajes-equipo.service';
import { EnviarMensajeDto } from './dto/enviar-mensaje.dto';
import { ListarMensajesDto } from './dto/listar-mensajes.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string; organizacion_id?: number };
}

@ApiTags('mensajes-equipo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO, ROLES.OPERARIO)
@Controller('mensajes-equipo')
export class MensajesEquipoController {
  constructor(private servicio: MensajesEquipoService) {}

  @Post()
  @ApiOperation({ summary: 'Enviar un mensaje a la conversación de un galpón' })
  enviar(@Body() dto: EnviarMensajeDto, @Req() req: AuthRequest) {
    return this.servicio.enviar(dto, req.user);
  }

  @Get('resumen')
  @ApiOperation({
    summary: 'Galpones con conversación y cuántos mensajes sin leer tiene cada uno',
  })
  resumen(@Req() req: AuthRequest) {
    return this.servicio.resumen(req.user);
  }

  @Get('galpon/:galponId')
  @ApiOperation({
    summary: 'Listar los mensajes de un galpón (del más reciente al más antiguo)',
  })
  listarDeGalpon(
    @Param('galponId', ParseIntPipe) galponId: number,
    @Query() query: ListarMensajesDto,
    @Req() req: AuthRequest,
  ) {
    return this.servicio.listarDeGalpon(galponId, req.user, query);
  }

  @Patch('galpon/:galponId/leidos')
  @ApiOperation({ summary: 'Marcar como leídos los mensajes ajenos del galpón' })
  marcarLeidos(
    @Param('galponId', ParseIntPipe) galponId: number,
    @Req() req: AuthRequest,
  ) {
    return this.servicio.marcarLeidos(galponId, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Borrar un mensaje propio' })
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.servicio.eliminar(id, req.user);
  }
}
