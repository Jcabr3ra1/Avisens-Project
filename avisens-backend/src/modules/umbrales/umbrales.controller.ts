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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/auth/roles';
import { UmbralesService } from './umbrales.service';
import { CreateUmbralDto } from './dto/create-umbral.dto';
import { RevisarUmbralDto } from './dto/revisar-umbral.dto';
import { QueryUmbralesDto } from './dto/query-umbrales.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string };
}

@ApiTags('umbrales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('umbrales')
export class UmbralesController {
  constructor(private umbralesService: UmbralesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un umbral (versión 1, vigente)' })
  crear(@Body() dto: CreateUmbralDto, @Req() req: AuthRequest) {
    return this.umbralesService.crear(dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar umbrales (por defecto solo vigentes; incluir_historico para todos)',
  })
  listar(@Query() query: QueryUmbralesDto, @Req() req: AuthRequest) {
    return this.umbralesService.listar(query, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un umbral por ID' })
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.umbralesService.obtener(id, req.user);
  }

  @Patch(':id/revisar')
  @ApiOperation({
    summary: 'Revisar un umbral: crea una versión nueva y jubila la anterior',
  })
  revisar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RevisarUmbralDto,
    @Req() req: AuthRequest,
  ) {
    return this.umbralesService.revisar(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Jubilar un umbral (vigente=false, sin reemplazo)' })
  jubilar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.umbralesService.jubilar(id, req.user);
  }
}
