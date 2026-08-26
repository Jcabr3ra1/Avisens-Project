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
import { RegistrosMortalidadService } from './registros-mortalidad.service';
import { CreateRegistroMortalidadDto } from './dto/create-registro-mortalidad.dto';
import { UpdateRegistroMortalidadDto } from './dto/update-registro-mortalidad.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    rol: string;
  };
}

@ApiTags('registros-mortalidad')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('registros-mortalidad')
export class RegistrosMortalidadController {
  constructor(private registrosMortalidadService: RegistrosMortalidadService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar una mortalidad de un lote' })
  crear(@Body() dto: CreateRegistroMortalidadDto, @Req() req: AuthRequest) {
    return this.registrosMortalidadService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar mortalidad paginado (Admin: todos - Propietario: los de sus lotes)',
  })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.registrosMortalidadService.listar(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un registro de mortalidad por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.registrosMortalidadService.obtener(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un registro de mortalidad' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRegistroMortalidadDto,
    @Req() req: AuthRequest,
  ) {
    return this.registrosMortalidadService.actualizar(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un registro de mortalidad' })
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.registrosMortalidadService.eliminar(id, req.user);
  }
}
