import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PreguntarDto {
  @ApiProperty({
    example: '¿Como va el lote 1?',
    description: 'Pregunta en lenguaje natural sobre los lotes del usuario',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  pregunta: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Id de una conversacion existente para continuarla',
  })
  @IsInt()
  @IsOptional()
  conversacion_id?: number;
}
