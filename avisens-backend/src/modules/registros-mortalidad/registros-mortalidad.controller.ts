import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
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
    email?: string | null;
    rol: string;
  };
}

@ApiTags('registros-mortalidad')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO, ROLES.OPERARIO)
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

  @Get(':id/foto')
  @ApiOperation({
    summary: 'Obtener la evidencia fotográfica almacenada de una mortalidad',
  })
  async foto(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
    @Res() res: Response,
  ) {
    const { buffer, mimeType } =
      await this.registrosMortalidadService.obtenerFoto(id, req.user);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(buffer);
  }

  @Put(':id/foto')
  @ApiOperation({
    summary:
      'Subir o actualizar la evidencia fotográfica de una mortalidad (JPG/PNG/WebP, máx. 3 MB)',
  })
  subirFoto(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.registrosMortalidadService.subirFoto(id, req.body, req.user);
  }

  @Delete(':id/foto')
  @ApiOperation({
    summary: 'Eliminar la evidencia fotográfica de un registro de mortalidad',
  })
  eliminarFoto(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.registrosMortalidadService.eliminarFoto(id, req.user);
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

  // Borrar no es registrar. El operario carga y corrige lo del día con POST y
  // PATCH, pero un registro borrado desaparece del histórico que alimenta los
  // indicadores y las alertas de desvío, y el alcance por galpón le dejaba
  // borrar también lo que cargó un compañero días atrás.
  @Delete(':id')
  @Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
  @ApiOperation({ summary: 'Eliminar un registro de mortalidad' })
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.registrosMortalidadService.eliminar(id, req.user);
  }
}
