import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

interface AuthRequest extends Request {
  user: { sub: number; email: string; session_id: string; refresh_token: string };
}

interface AccessRequest extends Request {
  user: { rol: string };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('permisos')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Consultar capacidades RBAC del usuario autenticado',
  })
  permisos(@Req() req: AccessRequest) {
    return this.authService.obtenerPermisos(req.user.rol);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Iniciar sesión' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.ip, req.headers['user-agent']);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiOperation({
    summary: 'Renovar access token con refresh token (en el body, no en Authorization)',
  })
  refresh(@Body() _dto: RefreshDto, @Req() req: AuthRequest) {
    return this.authService.refresh(
      req.user.sub,
      req.user.session_id,
      req.user.refresh_token,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiOperation({
    summary: 'Cerrar sesión (revoca esta sesión; refresh token en el body, no en Authorization)',
  })
  logout(@Body() _dto: RefreshDto, @Req() req: AuthRequest) {
    return this.authService.logout(req.user.sub, req.user.session_id);
  }
}
