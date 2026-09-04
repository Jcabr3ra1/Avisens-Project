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
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permisos } from '../../common/decorators/permisos.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PERMISOS } from '../../common/auth/permisos';
import { ROLES } from '../../common/auth/roles';
import { MovimientosInventarioService } from './movimientos-inventario.service';
import {
  CreateMovimientoInventarioDto,
  ListarMovimientosInventarioDto,
} from './dto/create-movimiento-inventario.dto';

interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    rol: string;
    organizacion_id?: number | null;
  };
}

@ApiTags('movimientos-inventario')
@ApiBearerAuth()
// Esta ruta y POST /insumos/:id/movimientos son la MISMA operacion: el
// service de aqui delega en insumosService.registrarMovimiento. Tenian
// reglas distintas, asi que registrar un consumo funcionaba o no segun por
// donde se entrara. Mandan las mismas que la otra puerta, porque registrar
// consumo es el trabajo diario del operario.
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO, ROLES.OPERARIO)
@Permisos(PERMISOS.OPERACION_REGISTRAR)
@Controller('movimientos-inventario')
export class MovimientosInventarioController {
  constructor(private service: MovimientosInventarioService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar un movimiento y actualizar el stock de forma atómica',
  })
  crear(@Body() dto: CreateMovimientoInventarioDto, @Req() req: AuthRequest) {
    return this.service.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar movimientos de inventario paginados' })
  listar(
    @Query() query: ListarMovimientosInventarioDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.listar(req.user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un movimiento por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.obtener(id, req.user);
  }
}
