import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/roles';
import { InteraccionesChatbotService } from './interacciones-chatbot.service';
import { CreateInteraccionChatbotDto } from './dto/create-interaccion-chatbot.dto';
import { ListarInteraccionesDto } from './dto/listar-interacciones.dto';

@ApiTags('interacciones-chatbot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR)
@Controller('interacciones-chatbot')
export class InteraccionesChatbotController {
  constructor(private service: InteraccionesChatbotService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar una interacción del chatbot' })
  crear(@Body() dto: CreateInteraccionChatbotDto) {
    return this.service.crear(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar interacciones paginadas con filtros' })
  listar(@Query() dto: ListarInteraccionesDto) {
    return this.service.listar(dto);
  }

  @Get('estadisticas')
  @ApiOperation({ summary: 'Resumen de interacciones: total, por tipo, confianza promedio' })
  estadisticas() {
    return this.service.estadisticas();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una interacción por ID' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.service.obtener(id);
  }
}
