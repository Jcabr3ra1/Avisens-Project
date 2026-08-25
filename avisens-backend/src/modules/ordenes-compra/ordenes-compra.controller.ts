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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/auth/roles';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { OrdenesCompraService } from './ordenes-compra.service';
import { CreateOrdenesCompraDto } from './dto/create-ordenes-compra.dto';
import { UpdateOrdenesCompraDto } from './dto/update-ordenes-compra.dto';
import { CreateDetalleOrdenDto } from './dto/create-detalle-orden.dto';
import { RecibirOrdenDto } from './dto/recibir-orden.dto';
import type { Request } from 'express';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string };
}

@ApiTags('ordenes-compra')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('ordenes-compra')
export class OrdenesCompraController {
  constructor(private ordenesCompraService: OrdenesCompraService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una orden de la compra' })
  crear(@Body() dto: CreateOrdenesCompraDto, @Req() req: AuthRequest) {
    return this.ordenesCompraService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar órdenes de compra paginadas' })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.ordenesCompraService.listar(paginacion, req.user);
  }

  @Post(':id/detalles')
  @ApiOperation({ summary: 'Agregar un renglón de insumo a la orden' })
  agregarDetalle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateDetalleOrdenDto,
    @Req() req: AuthRequest,
  ) {
    return this.ordenesCompraService.agregarDetalle(id, dto, req.user);
  }

  @Delete(':id/detalles/:detalleId')
  @ApiOperation({ summary: 'Eliminar un renglón que aún no se ha recibido' })
  eliminarDetalle(
    @Param('id', ParseIntPipe) id: number,
    @Param('detalleId', ParseIntPipe) detalleId: number,
    @Req() req: AuthRequest,
  ) {
    return this.ordenesCompraService.eliminarDetalle(id, detalleId, req.user);
  }

  @Post(':id/recepciones')
  @ApiOperation({
    summary: 'Recibir total o parcialmente una orden e ingresar stock',
  })
  recibir(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecibirOrdenDto,
    @Req() req: AuthRequest,
  ) {
    return this.ordenesCompraService.recibir(id, dto, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una orden de compra por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.ordenesCompraService.obtener(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una orden de compra' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrdenesCompraDto,
    @Req() req: AuthRequest,
  ) {
    return this.ordenesCompraService.actualizar(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una orden de compra' })
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.ordenesCompraService.eliminar(id, req.user);
  }
}
