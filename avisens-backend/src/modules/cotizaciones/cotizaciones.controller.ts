import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/auth/roles';
import { CotizacionesService } from './cotizaciones.service';
import { GenerarCotizacionDto } from './dto/generar-cotizacion.dto';

@ApiTags('cotizaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR)
@Controller('cotizaciones')
export class CotizacionesController {
  constructor(private cotizacionesService: CotizacionesService) {}

  @Post('prospecto/:prospectoId')
  @ApiOperation({ summary: 'Generar una cotizacion para un prospecto' })
  generar(
    @Param('prospectoId', ParseIntPipe) prospectoId: number,
    @Body() dto: GenerarCotizacionDto,
  ) {
    return this.cotizacionesService.generar(prospectoId, dto);
  }

  @Get('prospecto/:prospectoId')
  @ApiOperation({ summary: 'Listar las cotizaciones de un prospecto' })
  listar(@Param('prospectoId', ParseIntPipe) prospectoId: number) {
    return this.cotizacionesService.listarDeProspecto(prospectoId);
  }
}
