import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class CreateAnalisisVisionDto {
  @ApiProperty({ example: 1, description: 'Galpón donde se capturó la imagen' })
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

  @ApiPropertyOptional({ example: 'conteo_aves' })
  @IsString()
  @IsOptional()
  tipo_analisis?: string;

  @ApiPropertyOptional({ example: { aves_detectadas: 127, confianza: 0.94 } })
  @IsObject()
  @IsOptional()
  resultado?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'https://storage.example/imagen.jpg' })
  @IsUrl()
  @IsOptional()
  imagen_url?: string;
}

export class ListarAnalisisVisionDto extends PaginationQueryDto {
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
