import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { CRITICIDADES } from '../umbral-constantes';
import { TextoSeguro } from '../../../common/validation/texto';

export class RevisarUmbralDto {
  @ApiPropertyOptional({ example: 29.5 })
  @IsNumber()
  @Min(-50)
  @Max(100_000)
  @IsOptional()
  valor_minimo?: number;

  @ApiPropertyOptional({ example: 32.5 })
  @IsNumber()
  @Min(-50)
  @Max(100_000)
  @IsOptional()
  valor_maximo?: number;

  @ApiPropertyOptional({ example: '°C' })
  @IsOptional()
  @TextoSeguro('La unidad', 20)
  unidad?: string;

  @ApiPropertyOptional({ example: 'critica', enum: CRITICIDADES })
  @IsIn(CRITICIDADES)
  @IsOptional()
  criticidad?: string;
}
