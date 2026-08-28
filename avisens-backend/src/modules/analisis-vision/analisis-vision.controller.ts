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
import { PERMISOS } from '../../common/auth/permisos';
import { ROLES } from '../../common/auth/roles';
import { Permisos } from '../../common/decorators/permisos.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AnalisisVisionService } from './analisis-vision.service';
import {
  CreateAnalisisVisionDto,
  ListarAnalisisVisionDto,
} from './dto/create-analisis-vision.dto';
import { UpdateAnalisisVisionDto } from './dto/update-analisis-vision.dto';

interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    rol: string;
    organizacion_id?: number | null;
  };
}

@ApiTags('analisis-vision')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO, ROLES.OPERARIO)
@Permisos(PERMISOS.INFRAESTRUCTURA_LEER)
@Controller('analisis-vision')
export class AnalisisVisionController {
  constructor(private service: AnalisisVisionService) {}

  @Post()
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @Permisos(PERMISOS.INFRAESTRUCTURA_GESTIONAR)
  @ApiOperation({ summary: 'Registrar un análisis de visión' })
  crear(@Body() dto: CreateAnalisisVisionDto, @Req() req: AuthRequest) {
    return this.service.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar análisis de visión accesibles' })
  listar(@Query() query: ListarAnalisisVisionDto, @Req() req: AuthRequest) {
    return this.service.listar(req.user, query);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.obtener(id, req.user);
  }

  @Patch(':id')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @Permisos(PERMISOS.INFRAESTRUCTURA_GESTIONAR)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAnalisisVisionDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.actualizar(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(ROLES.ADMINISTRADOR)
  @Permisos(PERMISOS.INFRAESTRUCTURA_GESTIONAR)
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.eliminar(id, req.user);
  }
}
