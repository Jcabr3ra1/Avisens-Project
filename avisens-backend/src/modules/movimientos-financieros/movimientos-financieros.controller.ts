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
import { MovimientosFinancierosService } from './movimientos-financieros.service';
import { CreateMovimientoFinancieroDto } from './dto/create-movimiento-financiero.dto';
import { UpdateMovimientoFinancieroDto } from './dto/update-movimiento-financiero.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string };
}

@ApiTags('movimientos-financieros')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('movimientos-financieros')
export class MovimientosFinancierosController {
  constructor(private movimientosService: MovimientosFinancierosService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar un movimiento financiero (ingreso/egreso)',
  })
  crear(@Body() dto: CreateMovimientoFinancieroDto, @Req() req: AuthRequest) {
    return this.movimientosService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar movimientos paginado (Admin: todos - Propietario: los de sus lotes)',
  })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.movimientosService.listar(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un movimiento financiero por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.movimientosService.obtener(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un movimiento financiero' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMovimientoFinancieroDto,
    @Req() req: AuthRequest,
  ) {
    return this.movimientosService.actualizar(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un movimiento financiero' })
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.movimientosService.eliminar(id, req.user);
  }
}
