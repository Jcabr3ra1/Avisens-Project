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
import { ConsumosDiariosService } from './consumos-diarios.service';
import { CreateConsumoDiarioDto } from './dto/create-consumo-diario.dto';
import { UpdateConsumoDiarioDto } from './dto/update-consumo-diario.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    rol: string;
  };
}

@ApiTags('consumos-diarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('consumos-diarios')
export class ConsumosDiariosController {
  constructor(private consumosDiariosService: ConsumosDiariosService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar el consumo diario de un lote' })
  crear(@Body() dto: CreateConsumoDiarioDto, @Req() req: AuthRequest) {
    return this.consumosDiariosService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar consumos diarios paginado (Admin: todos - Propietario: los de sus lotes)',
  })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.consumosDiariosService.listar(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un consumo diario por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.consumosDiariosService.obtener(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un consumo diario' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConsumoDiarioDto,
    @Req() req: AuthRequest,
  ) {
    return this.consumosDiariosService.actualizar(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un consumo diario' })
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.consumosDiariosService.eliminar(id, req.user);
  }
}
