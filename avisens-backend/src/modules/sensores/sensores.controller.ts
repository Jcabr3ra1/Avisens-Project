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
import { SensoresService } from './sensores.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    rol: string;
  };
}

@ApiTags('sensores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO, ROLES.OPERARIO)
@Controller('sensores')
export class SensoresController {
  constructor(private sensoresService: SensoresService) {}

  @Post()
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @ApiOperation({ summary: 'Registrar un sensor en un galpón' })
  crear(@Body() dto: CreateSensorDto, @Req() req: AuthRequest) {
    return this.sensoresService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar sensores paginado (Admin: todos · Propietario: los de sus galpones)',
  })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.sensoresService.listar(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un sensor por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.sensoresService.obtener(id, req.user);
  }

  @Patch(':id')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @ApiOperation({ summary: 'Actualizar un sensor' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSensorDto,
    @Req() req: AuthRequest,
  ) {
    return this.sensoresService.actualizar(id, dto, req.user);
  }

  @Patch(':id/activar')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @ApiOperation({ summary: 'Activar un sensor (estado → activo)' })
  activar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.sensoresService.activar(id, req.user);
  }

  @Delete(':id')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @ApiOperation({
    summary: 'Desactivar un sensor (borrado suave, estado → inactivo)',
  })
  desactivar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.sensoresService.desactivar(id, req.user);
  }

  @Delete(':id/permanente')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @ApiOperation({
    summary: 'Eliminar un sensor de forma permanente (casos legales)',
  })
  eliminarPermanente(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ) {
    return this.sensoresService.eliminarPermanente(id, req.user);
  }
}
