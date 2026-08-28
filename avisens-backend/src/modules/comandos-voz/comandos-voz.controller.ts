import {
  Body,
  Controller,
  Get,
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
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { ComandosVozService } from './comandos-voz.service';
import { InterpretarComandoVozDto } from './dto/interpretar-comando-voz.dto';
import { SincronizarComandosVozDto } from './dto/sincronizar-comandos-voz.dto';

interface AuthRequest extends Request {
  user: { id: number; rol: string; organizacion_id?: number };
}

@ApiTags('comandos-voz')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO, ROLES.OPERARIO)
@Controller('comandos-voz')
export class ComandosVozController {
  constructor(private readonly comandos: ComandosVozService) {}

  @Post('interpretar')
  @ApiOperation({ summary: 'Interpretar y registrar un comando de voz seguro' })
  interpretar(@Body() dto: InterpretarComandoVozDto, @Req() req: AuthRequest) {
    return this.comandos.interpretar(dto, req.user);
  }

  @Post('sincronizar')
  @ApiOperation({ summary: 'Sincronizar hasta 50 comandos capturados offline' })
  sincronizar(@Body() dto: SincronizarComandosVozDto, @Req() req: AuthRequest) {
    return this.comandos.sincronizar(dto, req.user);
  }

  @Get('historial')
  @ApiOperation({ summary: 'Consultar el historial propio de comandos' })
  historial(@Query() query: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.comandos.historial(req.user, query);
  }
}
