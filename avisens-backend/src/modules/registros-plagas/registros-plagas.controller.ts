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
import { RegistrosPlagasService } from './registros-plagas.service';
import { CreateRegistroPlagaDto } from './dto/create-registro-plaga.dto';
import { UpdateRegistroPlagaDto } from './dto/update-registro-plaga.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    rol: string;
  };
}

@ApiTags('registros-plagas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('registros-plagas')
export class RegistrosPlagasController {
  constructor(private registrosPlagasService: RegistrosPlagasService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar una plaga detectada en un lote' })
  crear(@Body() dto: CreateRegistroPlagaDto, @Req() req: AuthRequest) {
    return this.registrosPlagasService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar registros de plagas paginado (Admin: todos - Propietario: los de sus lotes)',
  })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.registrosPlagasService.listar(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un registro de plaga por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.registrosPlagasService.obtener(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un registro de plaga' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRegistroPlagaDto,
    @Req() req: AuthRequest,
  ) {
    return this.registrosPlagasService.actualizar(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un registro de plaga' })
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.registrosPlagasService.eliminar(id, req.user);
  }
}
