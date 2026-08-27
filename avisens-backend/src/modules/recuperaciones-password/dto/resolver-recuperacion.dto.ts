import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolverRecuperacionDto {
  @ApiPropertyOptional({ example: 'Identidad verificada telefónicamente' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  observacion?: string;
}
