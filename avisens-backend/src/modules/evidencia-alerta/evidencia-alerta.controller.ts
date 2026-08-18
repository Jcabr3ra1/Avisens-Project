import {
  UseGuards,
  Controller,
  Post,
  Body,
  Req,
  Get,
  Query,
  Param,
  ParseIntPipe,
  Patch,
  Delete,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/roles';
import { AlertasService } from '../alertas/alertas.service';
import { CreateAlertasDto } from '../alertas/dto/create-alertas.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { UpdateAlertasDto } from '../alertas/dto/update-alertas.dto';

interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    rol: string;
  };
}

@ApiTags('alertas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('alertas')
export class EvidenciaAlertaController {
  constructor(private readonly alertasService: AlertasService) {}

  @Post()
  crear(@Body() dto: CreateAlertasDto, @Req() req: AuthRequest) {
    return this.alertasService.crear(dto, req.user);
  }

  @Get()
  listar(@Query() paginacion: PaginationQueryDto, @Req() req: AuthRequest) {
    return this.alertasService.listar(req.user, paginacion);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.alertasService.obtener(id, req.user);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAlertasDto,
    @Req() req: AuthRequest,
  ) {
    return this.alertasService.actualizar(id, dto, req.user);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.alertasService.eliminar(id, req.user);
  }

  @Patch(':id/aceptar')
  aceptar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.alertasService.aceptar(id, req.user);
  }

  @Patch(':id/cerrar')
  cerrar(
    @Param('id', ParseIntPipe) id: number,
    @Body('accion_correctiva') accionCorrectiva: string,
    @Req() req: AuthRequest,
  ) {
    return this.alertasService.cerrar(
      id,
      { accion_correctiva: accionCorrectiva },
      req.user,
    );
  }

  @Patch(':id/escalar/:usuarioId')
  escalar(
    @Param('id', ParseIntPipe) id: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Req() req: AuthRequest,
  ) {
    return this.alertasService.escalar(id, usuarioId, req.user);
  }

  @Get('galpon:galponId')
  obtenerPorGalpon(
    @Param('galponId', ParseIntPipe) galponId: number,
    @Query() paginacion: PaginationQueryDto,
    @Req() req: AuthRequest,
  ) {
    return this.alertasService.obtenerPorGalpon(galponId, req.user, paginacion);
  }

  @Get('lote/:loteId')
  obtenerPorLote(
    @Param('loteId', ParseIntPipe) loteId: number,
    @Query() paginacion: PaginationQueryDto,
    @Req() req: AuthRequest,
  ) {
    return this.alertasService.obtenerPorLote(loteId, req.user, paginacion);
  }

  @Get('estadisticas/resumen')
  obtenerEstadidticas(@Req() req: AuthRequest) {
    return this.alertasService.obtenerEstadisticas(req.user);
  }
}
