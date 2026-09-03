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
import { EvidenciaAlertaService } from './evidencia-alerta.service';
import { CreateEvidenciaAlertaDto } from './dto/create-evidencia-alerta.dto';
import { UpdateEvidenciaAlertaDto } from './dto/update-evidencia-alerta.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    rol: string;
  };
}

@ApiTags('evidencias-alerta')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO, ROLES.OPERARIO)
@Controller('evidencias-alerta')
export class EvidenciaAlertaController {
  constructor(
    private readonly evidenciaAlertaService: EvidenciaAlertaService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Adjuntar una evidencia a una alerta' })
  crear(@Body() dto: CreateEvidenciaAlertaDto, @Req() req: AuthRequest) {
    return this.evidenciaAlertaService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar evidencias paginado (Admin: todas - Propietario: las de sus granjas)',
  })
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.evidenciaAlertaService.listar(req.user, paginacion);
  }

  @Get('alerta/:alertaId')
  @ApiOperation({ summary: 'Listar las evidencias de una alerta' })
  listarPorAlerta(
    @Param('alertaId', ParseIntPipe) alertaId: number,
    @Query() paginacion: PaginationQueryDto,
    @Req() req: AuthRequest,
  ) {
    return this.evidenciaAlertaService.listarPorAlerta(
      alertaId,
      req.user,
      paginacion,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una evidencia por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.evidenciaAlertaService.obtener(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una evidencia' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEvidenciaAlertaDto,
    @Req() req: AuthRequest,
  ) {
    return this.evidenciaAlertaService.actualizar(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una evidencia' })
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.evidenciaAlertaService.eliminar(id, req.user);
  }
}
