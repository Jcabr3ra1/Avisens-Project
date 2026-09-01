import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ROLES } from '../../common/auth/roles';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChatService } from './chat.service';

interface AuthRequest extends Request {
  user: { id: number; email: string; rol: string; organizacion_id?: number };
}

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.PROPIETARIO, ROLES.OPERARIO)
@Controller('chat')
export class ChatController {
  constructor(private servicio: ChatService) {}

  @Get('contactos')
  @ApiOperation({
    summary:
      'Personas a las que se les puede escribir (Admin: todas · resto: su organización)',
  })
  contactos(@Req() req: AuthRequest) {
    return this.servicio.contactos(req.user);
  }
}
