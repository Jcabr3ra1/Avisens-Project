import {
  Body,
  Controller,
  Get,
  Header,
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
import { ProspectosService } from './prospectos.service';
import { ListarProspectosDto } from './dto/listar-prospectos.dto';
import { AsignarAsesorDto } from './dto/asignar-asesor.dto';
import { ConvertirProspectoDto } from './dto/convertir-prospecto.dto';
import { CerrarProspectoDto } from './dto/cerrar-prospecto.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string };
}

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
  @ApiOperation({ summary: 'Asignar un administrador a un prospecto calificado' })
  asignar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AsignarAsesorDto,
  ) {
    return this.prospectosService.asignar(id, dto.asesor_id);
  }

  @Post(':id/convertir')
  @ApiOperation({
    summary:
      'Convertir un prospecto en cliente: crea organización y propietario, y lo cierra como ganado',
  })
  convertir(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConvertirProspectoDto,
    @Req() req: AuthRequest,
  ) {
    return this.prospectosService.convertir(id, dto, req.user);
  }

  @Patch(':id/cerrar')
  @ApiOperation({
    summary:
      'Cerrar un prospecto sin crear cliente: perdido con su motivo, o ganado apuntando a un cliente que ya existe',
  })
  cerrar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CerrarProspectoDto,
  ) {
    return this.prospectosService.cerrar(id, dto);
  }
}
