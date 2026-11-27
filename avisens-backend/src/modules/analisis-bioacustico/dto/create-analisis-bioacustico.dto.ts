import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';
import {
  TextoSeguro,
  UrlHttpSegura,
} from '../../../common/validation/texto';

export class CreateAnalisisBioacusticoDto {
  @ApiProperty({ example: 1, description: 'Galpón donde se capturó el audio' })
  @IsInt()
  @Min(1)
  galpon_id: number;

  @ApiPropertyOptional({ example: 1, description: 'Lote analizado' })
  @IsInt()
  @Min(1)
  @IsOptional()
  lote_id?: number;

  @ApiPropertyOptional({ example: 1, description: 'Modelo ML utilizado' })
  @IsInt()
  @Min(1)
  @IsOptional()
  modelo_id?: number;

  @ApiPropertyOptional({ example: '2026-08-27T15:30:00.000Z' })
  @IsDateString()
  @IsOptional()
  fecha_hora?: string;

  @ApiPropertyOptional({ example: 'nivel_estres' })
  @IsOptional()
  @TextoSeguro('El indicador', 60)
  indicador?: string;

  @ApiPropertyOptional({ example: 0.27 })
  @IsNumber()
  @Min(-1_000_000)
  @Max(1_000_000)
  @IsOptional()
  valor?: number;

  @ApiPropertyOptional({ example: 'https://storage.example/audio.wav' })
  @IsOptional()
  @UrlHttpSegura('La URL del audio', 500)
  audio_url?: string;

  @ApiPropertyOptional({
    example: 'Patrón sonoro dentro de parámetros normales',
  })
  @IsOptional()
  @TextoSeguro('La interpretación', 500, { multilinea: true })
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
