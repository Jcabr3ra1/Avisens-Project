import {
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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { PERMISOS } from '../../common/auth/permisos';
import { Permisos } from '../../common/decorators/permisos.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { FirmwareService } from './firmware.service';

@ApiTags('firmware')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermisosGuard)
@Permisos(PERMISOS.CATALOGOS_LEER)
@Controller('firmware')
export class FirmwareController {
  constructor(private servicio: FirmwareService) {}

  @Get()
  @ApiOperation({ summary: 'Versiones de firmware subidas (sin el binario)' })
  listar() {
    return this.servicio.listar();
  }

  @Post()
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiConsumes('application/octet-stream')
  @ApiBody({ schema: { type: 'string', format: 'binary' } })
  @ApiOperation({
    summary:
      'Subir el .bin de PlatformIO; ?version=1.2.3&notas=… (queda sin publicar)',
  })
  subir(
    @Req() req: Request,
    @Query('version') version: string,
    @Query('notas') notas?: string,
  ) {
    return this.servicio.subir(req.body, version, notas);
  }

  @Patch(':id/publicar')
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiOperation({
    summary: 'Publicar: los controladores la descargan en su próxima consulta',
  })
  publicar(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.publicar(id);
  }

  @Patch(':id/retirar')
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiOperation({
    summary: 'Dejar de ofrecer esta versión a los controladores',
  })
  retirar(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.retirarPublicacion(id);
  }

  @Delete(':id')
  @Permisos(PERMISOS.CATALOGOS_GESTIONAR)
  @ApiOperation({ summary: 'Eliminar una versión que no esté publicada' })
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.eliminar(id);
  }
}
