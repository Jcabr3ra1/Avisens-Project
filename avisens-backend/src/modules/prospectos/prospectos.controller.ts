import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/roles';
import { ProspectosService } from './prospectos.service';
import { ListarProspectosDto } from './dto/listar-prospectos.dto';
import { AsignarAsesorDto } from './dto/asignar-asesor.dto';

@ApiTags('prospectos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR)
@Controller('prospectos')
export class ProspectosController {
  constructor(private prospectosService: ProspectosService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar prospectos del chatbot, los de mayor puntaje primero',
  })
  listar(@Query() dto: ListarProspectosDto) {
    return this.prospectosService.listar(dto);
  }

  @Get('exportar')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="prospectos.csv"')
  @ApiOperation({
    summary:
      'Exportar prospectos a CSV (respeta los mismos filtros del listado)',
  })
  exportar(@Query() dto: ListarProspectosDto) {
    return this.prospectosService.exportarCsv(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver un prospecto con todas sus respuestas' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.prospectosService.obtener(id);
  }

  @Patch(':id/asignar')
  @ApiOperation({ summary: 'Asignar un asesor a un prospecto calificado' })
  asignar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AsignarAsesorDto,
  ) {
    return this.prospectosService.asignar(id, dto.asesor_id);
  }
}
