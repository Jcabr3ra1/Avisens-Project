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
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/auth/roles';
import { CurvasObjetivoService } from './curvas-objetivo.service';
import { CreateCurvaObjetivoDto } from './dto/create-curva-objetivo.dto';
import { UpdateCurvaObjetivoDto } from './dto/update-curva-objetivo.dto';
import { QueryCurvasObjetivoDto } from './dto/query-curvas-objetivo.dto';

@ApiTags('curvas-objetivo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('curvas-objetivo')
export class CurvasObjetivoController {
  constructor(private curvasObjetivoService: CurvasObjetivoService) {}

  @Post()
  @Roles(ROLES.ADMINISTRADOR)
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
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar un punto de curva (solo Admin)' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCurvaObjetivoDto,
  ) {
    return this.curvasObjetivoService.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles(ROLES.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Eliminar un punto de curva de forma permanente (solo Admin)',
  })
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.curvasObjetivoService.eliminar(id);
  }
}
