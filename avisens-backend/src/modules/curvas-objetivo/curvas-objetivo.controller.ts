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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { Permisos } from '../../common/decorators/permisos.decorator';
import { PERMISOS } from '../../common/auth/permisos';
import { CurvasObjetivoService } from './curvas-objetivo.service';
import { CreateCurvaObjetivoDto } from './dto/create-curva-objetivo.dto';
import { UpdateCurvaObjetivoDto } from './dto/update-curva-objetivo.dto';
import { QueryCurvasObjetivoDto } from './dto/query-curvas-objetivo.dto';

@ApiTags('curvas-objetivo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermisosGuard)
@Permisos(PERMISOS.CATALOGOS_LEER)
@Controller('curvas-objetivo')
export class CurvasObjetivoController {
  constructor(private curvasObjetivoService: CurvasObjetivoService) {}

  @Post()
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiOperation({ summary: 'Crear un punto de curva objetivo (solo Admin)' })
  crear(@Body() dto: CreateCurvaObjetivoDto) {
    return this.curvasObjetivoService.crear(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar la curva objetivo paginada, filtro opcional por sexo (Admin y Propietario)',
  })
  listar(@Query() query: QueryCurvasObjetivoDto) {
    return this.curvasObjetivoService.listar(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un punto de curva por ID' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.curvasObjetivoService.obtener(id);
  }

  @Patch(':id')
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiOperation({ summary: 'Actualizar un punto de curva (solo Admin)' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCurvaObjetivoDto,
  ) {
    return this.curvasObjetivoService.actualizar(id, dto);
  }

  @Delete(':id')
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiOperation({
    summary: 'Eliminar un punto de curva de forma permanente (solo Admin)',
  })
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.curvasObjetivoService.eliminar(id);
  }
}
