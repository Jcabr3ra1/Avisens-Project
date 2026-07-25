import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { CRITICIDADES } from '../umbral-constantes';

export class RevisarUmbralDto {
  @ApiPropertyOptional({ example: 29.5 })
  @IsNumber()
  @IsOptional()
  valor_minimo?: number;

  @ApiPropertyOptional({ example: 32.5 })
  @IsNumber()
  @IsOptional()
  valor_maximo?: number;

  @ApiPropertyOptional({ example: '°C' })
  @IsString()
  @IsOptional()
  unidad?: string;

  @ApiPropertyOptional({ example: 'critica', enum: CRITICIDADES })
  @IsIn(CRITICIDADES)
  @IsOptional()
  criticidad?: string;
}
