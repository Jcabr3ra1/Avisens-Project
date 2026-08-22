import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/roles';
import { CopilotoService } from './copiloto.service';
import { PreguntarDto } from './dto/preguntar.dto';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string };
}

@ApiTags('copiloto')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO)
@Controller('copiloto')
export class CopilotoController {
  constructor(private copilotoService: CopilotoService) {}

  @Post('preguntar')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Preguntar en lenguaje natural sobre los lotes del usuario',
  })
  preguntar(@Body() dto: PreguntarDto, @Req() req: AuthRequest) {
    return this.copilotoService.preguntar(dto, req.user);
  }
}
