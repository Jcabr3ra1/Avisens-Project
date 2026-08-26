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
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { EquiposService } from './equipos.service';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';

interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    rol: string;
  };
}

@ApiTags('equipos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO, ROLES.OPERARIO)
@Controller('equipos')
export class EquiposController {
  constructor(private equiposService: EquiposService) {}

  @Post()
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @ApiOperation({ summary: 'Registrar un equipo en un galpón' })
  crear(@Body() dto: CreateEquipoDto, @Req() req: AuthRequest) {
    return this.equiposService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar equipos paginado (Admin: todos - Propietario: los de sus galpones)',
  })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.equiposService.listar(req.user, paginacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un equipo por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.equiposService.obtener(id, req.user);
  }

  @Patch(':id')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @ApiOperation({ summary: 'Actualizar un equipo' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEquipoDto,
    @Req() req: AuthRequest,
  ) {
    return this.equiposService.actualizar(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @ApiOperation({ summary: 'Eliminar un equipo' })
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.equiposService.eliminar(id, req.user);
  }
}
