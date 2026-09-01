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
import { CrearConversacionPrivadaDto } from './dto/crear-conversacion-privada.dto';
import { EnviarMensajePrivadoDto } from './dto/enviar-mensaje-privado.dto';

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

  @Get('galpon/:galponId/contactos')
  @ApiOperation({ summary: 'Personas del equipo habilitadas para conversación privada' })
  contactos(
    @Param('galponId', ParseIntPipe) galponId: number,
    @Req() req: AuthRequest,
  ) {
    return this.servicio.contactos(galponId, req.user);
  }

  @Get('galpon/:galponId/privadas')
  @ApiOperation({ summary: 'Conversaciones privadas propias dentro de un galpón' })
  listarPrivadas(
    @Param('galponId', ParseIntPipe) galponId: number,
    @Req() req: AuthRequest,
  ) {
    return this.servicio.listarPrivadas(galponId, req.user);
  }

  @Post('privadas')
  @ApiOperation({ summary: 'Abrir o recuperar una conversación privada del equipo' })
  abrirPrivada(@Body() dto: CrearConversacionPrivadaDto, @Req() req: AuthRequest) {
    return this.servicio.abrirPrivada(dto, req.user);
  }

  @Get('privadas/:id/mensajes')
  @ApiOperation({ summary: 'Listar mensajes de una conversación privada' })
  listarMensajesPrivados(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListarMensajesDto,
    @Req() req: AuthRequest,
  ) {
    return this.servicio.listarMensajesPrivados(id, req.user, query);
  }

  @Post('privadas/:id/mensajes')
  @ApiOperation({ summary: 'Enviar un mensaje privado del equipo' })
  enviarPrivado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EnviarMensajePrivadoDto,
    @Req() req: AuthRequest,
  ) {
    return this.servicio.enviarPrivado(id, dto, req.user);
  }

  @Patch('privadas/:id/leidos')
  @ApiOperation({ summary: 'Marcar como leídos los mensajes privados ajenos' })
  marcarPrivadosLeidos(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ) {
    return this.servicio.marcarPrivadosLeidos(id, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Borrar un mensaje propio' })
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.servicio.eliminar(id, req.user);
  }
}
