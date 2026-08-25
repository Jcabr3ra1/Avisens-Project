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
import { SolicitudesPqrsService } from './solicitudes-pqrs.service';
import { CreateSolicitudPqrsDto } from './dto/create-solicitud-pqrs.dto';
import { ListarSolicitudesPqrsDto } from './dto/listar-solicitudes-pqrs.dto';
import { ResponderSolicitudPqrsDto } from './dto/responder-solicitud-pqrs.dto';

@ApiTags('solicitudes-pqrs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR)
@Controller('solicitudes-pqrs')
export class SolicitudesPqrsController {
  constructor(private service: SolicitudesPqrsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una solicitud PQRS manualmente' })
  crear(@Body() dto: CreateSolicitudPqrsDto) {
    return this.service.crear(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar solicitudes PQRS paginadas' })
  listar(@Query() dto: ListarSolicitudesPqrsDto) {
    return this.service.listar(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver una solicitud PQRS con detalle' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.service.obtener(id);
  }

  @Patch(':id/responder')
  @ApiOperation({ summary: 'Responder o cambiar estado de una solicitud PQRS' })
  responder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResponderSolicitudPqrsDto,
  ) {
    return this.service.responder(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una solicitud PQRS' })
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminar(id);
  }
}
