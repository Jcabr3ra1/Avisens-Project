import { NombreUsuario } from '../../../common/auth/username';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { TextoSeguro } from '../../../common/validation/texto';

export class SolicitarRecuperacionDto {
  @ApiProperty({ example: 'maria.lopez', minLength: 3, maxLength: 30 })
  @NombreUsuario()
  username: string;

  @ApiPropertyOptional({ example: 'Olvidé mi contraseña' })
  @IsOptional()
  @TextoSeguro('El motivo', 500, { multilinea: true })
  motivo?: string;
}
