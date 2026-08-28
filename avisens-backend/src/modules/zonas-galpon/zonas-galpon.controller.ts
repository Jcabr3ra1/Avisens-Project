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
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permisos } from '../../common/decorators/permisos.decorator';
import { ROLES } from '../../common/auth/roles';
import { PERMISOS } from '../../common/auth/permisos';
import { ZonasGalponService } from './zonas-galpon.service';
import {
  CreateZonaGalponDto,
  ListarZonasGalponDto,
} from './dto/create-zona-galpon.dto';
import { UpdateZonaGalponDto } from './dto/update-zona-galpon.dto';

interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    rol: string;
    organizacion_id?: number | null;
  };
}

@ApiTags('zonas-galpon')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Permisos(PERMISOS.INFRAESTRUCTURA_LEER)
@Controller('zonas-galpon')
export class ZonasGalponController {
  constructor(private service: ZonasGalponService) {}

  @Post()
  @Permisos(PERMISOS.INFRAESTRUCTURA_GESTIONAR)
  @ApiOperation({ summary: 'Crear una zona dentro de un galpón' })
  crear(@Body() dto: CreateZonaGalponDto, @Req() req: AuthRequest) {
    return this.service.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar zonas paginadas' })
  listar(@Query() query: ListarZonasGalponDto, @Req() req: AuthRequest) {
    return this.service.listar(req.user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una zona por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.obtener(id, req.user);
  }

  @Patch(':id')
  @Permisos(PERMISOS.INFRAESTRUCTURA_GESTIONAR)
  @ApiOperation({ summary: 'Actualizar una zona' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateZonaGalponDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.actualizar(id, dto, req.user);
  }

  @Delete(':id')
  @Permisos(PERMISOS.INFRAESTRUCTURA_GESTIONAR)
  @ApiOperation({ summary: 'Desactivar una zona' })
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.eliminar(id, req.user);
  }
}
