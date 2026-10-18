import { NombreUsuario } from '../../../common/auth/username';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SolicitarRecuperacionDto {
  @ApiProperty({ example: 'maria.lopez', minLength: 3, maxLength: 30 })
  @NombreUsuario()
  username: string;

  @ApiPropertyOptional({ example: 'Olvidé mi contraseña' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  motivo?: string;
}
