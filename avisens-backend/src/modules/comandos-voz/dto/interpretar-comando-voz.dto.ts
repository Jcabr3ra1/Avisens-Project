import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class InterpretarComandoVozDto {
  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  galpon_id: number;

  @ApiProperty({ example: '¿Cuál es la temperatura del galpón?' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  comando_texto: string;

  @ApiPropertyOptional({ enum: ['online', 'offline'], default: 'online' })
  @IsIn(['online', 'offline'])
  @IsOptional()
  modo_conexion?: 'online' | 'offline' = 'online';

  @ApiPropertyOptional({
    description:
      'UUID generado por el dispositivo para deduplicar sincronizaciones',
  })
  @IsUUID()
  @IsOptional()
  id_sincronizacion?: string;

  @ApiPropertyOptional({
    description: 'Momento original de ejecución en campo',
  })
  @IsDateString()
  @IsOptional()
  fecha_ejecucion?: string;
}
