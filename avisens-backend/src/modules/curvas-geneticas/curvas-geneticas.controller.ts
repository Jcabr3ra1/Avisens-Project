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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { PERMISOS } from '../../common/auth/permisos';
import { Permisos } from '../../common/decorators/permisos.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { CurvasGeneticasService } from './curvas-geneticas.service';
import { CreateCurvaGeneticaDto } from './dto/create-curva-genetica.dto';
import { ReemplazarPuntosCurvaDto } from './dto/reemplazar-puntos-curva.dto';
import {
  CurvaGeneticaEliminadaRespuestaDto,
  CurvaGeneticaPaginadaDto,
  CurvaGeneticaRespuestaDto,
} from './dto/curva-genetica-respuesta.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string };
}

@ApiTags('curvas-geneticas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermisosGuard)
@Permisos(PERMISOS.CATALOGOS_LEER)
@Controller('curvas-geneticas')
export class CurvasGeneticasController {
  constructor(private servicio: CurvasGeneticasService) {}

  @Post()
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiOperation({
    summary: 'Crear una curva genética nueva (nace en borrador)',
  })
  @ApiCreatedResponse({ type: CurvaGeneticaRespuestaDto })
  crear(@Body() dto: CreateCurvaGeneticaDto) {
    return this.servicio.crear(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar curvas genéticas paginado' })
  @ApiOkResponse({ type: CurvaGeneticaPaginadaDto })
  listar(@Query() query: PaginationQueryDto) {
    return this.servicio.listar(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una curva genética con sus puntos' })
  @ApiOkResponse({ type: CurvaGeneticaRespuestaDto })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.obtener(id);
  }

  @Put(':id/puntos')
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiOperation({
    summary:
      'Reemplazar atómicamente todos los puntos del borrador (solo borrador)',
  })
  @ApiOkResponse({ type: CurvaGeneticaRespuestaDto })
  reemplazarPuntos(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReemplazarPuntosCurvaDto,
  ) {
    return this.servicio.reemplazarPuntos(id, dto);
  }

  @Patch(':id/publicar')
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiOperation({
    summary: 'Publicar el borrador: valida y lo congela (no lo activa)',
  })
  @ApiOkResponse({ type: CurvaGeneticaRespuestaDto })
  publicar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.servicio.publicar(id, req.user);
  }

  @Patch(':id/activar')
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiOperation({
    summary:
      'Activar una versión publicada: retira la vigente anterior de la misma línea+sexo',
  })
  @ApiOkResponse({ type: CurvaGeneticaRespuestaDto })
  activar(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.activar(id);
  }

  @Delete(':id')
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiOperation({
    summary: 'Eliminar un borrador (una publicada no se elimina)',
  })
  @ApiOkResponse({ type: CurvaGeneticaEliminadaRespuestaDto })
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.eliminar(id);
  }
}
