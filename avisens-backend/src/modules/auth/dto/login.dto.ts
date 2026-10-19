import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { NombreUsuario } from '../../../common/auth/username';

export class LoginDto {
  @ApiProperty({ example: 'maria.lopez', minLength: 3, maxLength: 30 })
  @NombreUsuario()
  username: string;

  @ApiProperty({ example: 'contraseña123' })
  @IsString()
  @MinLength(6)
  password: string;
}
