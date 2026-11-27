import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { NombreUsuario } from '../../../common/auth/username';

export class LoginDto {
  @ApiProperty({ example: 'maria.lopez', minLength: 3, maxLength: 30 })
  @NombreUsuario()
  username: string;

  @ApiProperty({ example: 'contraseña123' })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password: string;
}
