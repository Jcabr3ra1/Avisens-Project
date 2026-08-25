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
import { EventosSanitariosService } from './eventos-sanitarios.service';
import { CreateEventoSanitarioDto } from './dto/create-evento-sanitario.dto';
import { UpdateEventoSanitarioDto } from './dto/update-evento-sanitario.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    rol: string;
  };
}

@ApiTags('eventos-sanitarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('eventos-sanitarios')
export class EventosSanitariosController {
  constructor(private eventosSanitariosService: EventosSanitariosService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar un evento sanitario de un lote' })
  crear(@Body() dto: CreateEventoSanitarioDto, @Req() req: AuthRequest) {
    return this.eventosSanitariosService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar eventos sanitarios paginado (Admin: todos - Propietario: los de sus lotes)',
  })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.eventosSanitariosService.listar(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un evento sanitario por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.eventosSanitariosService.obtener(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un evento sanitario' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEventoSanitarioDto,
    @Req() req: AuthRequest,
  ) {
    return this.eventosSanitariosService.actualizar(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un evento sanitario' })
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.eventosSanitariosService.eliminar(id, req.user);
  }
}
