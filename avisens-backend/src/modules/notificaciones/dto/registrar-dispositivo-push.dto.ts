import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const PATRON_TOKEN_PUSH = /^[A-Za-z0-9._:-]+$/;

export class RegistrarDispositivoPushDto {
  @ApiProperty({
    example: 'fcm_token_dispositivo_android_1234567890',
    description: 'Token de registro FCM entregado por Firebase en el dispositivo',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(512)
  @Matches(PATRON_TOKEN_PUSH, {
    message: 'El token push tiene un formato no válido',
  })
  token: string;

  @ApiPropertyOptional({
    enum: ['android', 'ios', 'web'],
    default: 'android',
    description: 'Plataforma del dispositivo',
  })
  @IsOptional()
  @IsIn(['android', 'ios', 'web'])
  plataforma?: 'android' | 'ios' | 'web';
}
