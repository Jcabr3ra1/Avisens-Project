import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class CreateAnalisisBioacusticoDto {
  @ApiProperty({ example: 1, description: 'Galpón donde se capturó el audio' })
  @IsInt()
  galpon_id: number;

  @ApiPropertyOptional({ example: 1, description: 'Lote analizado' })
  @IsInt()
  @IsOptional()
  lote_id?: number;

  @ApiPropertyOptional({ example: 1, description: 'Modelo ML utilizado' })
  @IsInt()
  @IsOptional()
  modelo_id?: number;

  @ApiPropertyOptional({ example: '2026-08-27T15:30:00.000Z' })
  @IsDateString()
  @IsOptional()
  fecha_hora?: string;

  @ApiPropertyOptional({ example: 'nivel_estres' })
  @IsString()
  @IsOptional()
  indicador?: string;

  @ApiPropertyOptional({ example: 0.27 })
  @IsNumber()
  @IsOptional()
  valor?: number;

  @ApiPropertyOptional({ example: 'https://storage.example/audio.wav' })
  @IsUrl()
  @IsOptional()
  audio_url?: string;

  @ApiPropertyOptional({
    example: 'Patrón sonoro dentro de parámetros normales',
  })
  @IsString()
  @IsOptional()
  interpretacion?: string;
}

export class ListarAnalisisBioacusticoDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  galpon_id?: number;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  lote_id?: number;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  modelo_id?: number;
}
