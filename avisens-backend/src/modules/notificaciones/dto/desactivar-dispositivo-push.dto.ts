import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const PATRON_TOKEN_PUSH = /^[A-Za-z0-9._:-]+$/;

export class DesactivarDispositivoPushDto {
  @ApiProperty({
    example: 'fcm_token_dispositivo_android_1234567890',
    description: 'Token FCM del dispositivo a desactivar (ej. al cerrar sesión)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(512)
  @Matches(PATRON_TOKEN_PUSH, {
    message: 'El token push tiene un formato no válido',
  })
  token: string;
}
