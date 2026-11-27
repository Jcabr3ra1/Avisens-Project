import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { TextoSeguro } from '../../../common/validation/texto';

export class ResolverRecuperacionDto {
  @ApiPropertyOptional({ example: 'Identidad verificada telefónicamente' })
  @IsOptional()
  @TextoSeguro('La observación', 500, { multilinea: true })
  observacion?: string;
}
