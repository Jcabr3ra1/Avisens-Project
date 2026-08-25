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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/auth/roles';
import { MedicionesService } from './mediciones.service';
import { CreateMedicionDto } from './dto/create-medicion.dto';
import { QueryMedicionesDto } from './dto/query-mediciones.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string };
}

@ApiTags('mediciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('mediciones')
export class MedicionesController {
  constructor(private medicionesService: MedicionesService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar una medición de un sensor' })
  registrar(@Body() dto: CreateMedicionDto, @Req() req: AuthRequest) {
    return this.medicionesService.registrar(dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar mediciones (filtros: sensor_id, desde, hasta) paginado y por alcance de rol',
  })
  listar(@Query() query: QueryMedicionesDto, @Req() req: AuthRequest) {
    return this.medicionesService.listar(query, req.user);
  }
}
