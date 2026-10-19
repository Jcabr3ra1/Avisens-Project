import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { OrdenesActuadoresService } from './ordenes-actuadores.service';
import { CreateOrdenActuadorDto } from './dto/create-orden-actuador.dto';
import { QueryUltimasOrdenesDto } from './dto/query-ultimas-ordenes.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string; organizacion_id?: number };
}

// El operario también acciona: trabaja en el galpón. El alcance (solo sus
// galpones asignados) lo aplica el servicio con los helpers de alcance.
@ApiTags('ordenes-actuadores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO, ROLES.OPERARIO)
@Controller('ordenes-actuadores')
export class OrdenesActuadoresController {
  constructor(private ordenesService: OrdenesActuadoresService) {}

  @Post()
  @ApiOperation({
    summary: 'Ordenar encender, apagar o devolver a automático un relé (K1-K4)',
    description:
      'La orden queda "pendiente" hasta que el ESP32 la recoge en /ingest y la confirma. ' +
      'Que se cree no significa que el relé cambió: el ESP32 puede rechazarla por sus protecciones.',
  })
  crear(@Body() dto: CreateOrdenActuadorDto, @Req() req: AuthRequest) {
    return this.ordenesService.crear(dto, req.user);
  }

  @Get('ultimas')
  @ApiOperation({ summary: 'Última orden de cada relé de un galpón' })
  ultimas(@Query() query: QueryUltimasOrdenesDto, @Req() req: AuthRequest) {
    return this.ordenesService.ultimasPorGalpon(query.galpon_id, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Estado de una orden (para seguir su confirmación)' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.ordenesService.obtener(id, req.user);
  }
}
