import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  ETAPAS_ALIMENTACION,
  MARCAS_ALIMENTO,
  SEXOS_LOTE,
} from '../../../common/ganaderia/vocabulario';

export class CreateCurvaObjetivoDto {
  @ApiProperty({
    example: 'italcol',
    description: 'Marca de alimento. Es media llave de la curva, con el sexo.',
    enum: MARCAS_ALIMENTO,
  })
  @IsIn(MARCAS_ALIMENTO)
  marca: string;

  @ApiProperty({
    example: 'macho',
    description: 'Sexo: macho | hembra | mixto',
  })
  @IsIn(SEXOS_LOTE)
  sexo: string;

  @ApiProperty({ example: 21, description: 'Dia de vida del pollo' })
  @IsInt()
  dia: number;

  @ApiPropertyOptional({
    example: 'italcol',
    description: 'Fuente del dato: manual de la marca, cobb500, ross308, etc.',
  })
  @IsString()
  @IsOptional()
  fuente?: string;

  @ApiPropertyOptional({
    example: 1035,
    description: 'Peso esperado en gramos',
  })
  @IsNumber()
  @IsOptional()
  peso_esperado_g?: number;

  @ApiPropertyOptional({
    example: 114,
    description: 'Consumo diario esperado en gramos',
  })
  @IsNumber()
  @IsOptional()
  consumo_diario_g?: number;

  @ApiPropertyOptional({
    example: 1218,
    description: 'Consumo acumulado esperado en gramos',
  })
  @IsNumber()
  @IsOptional()
  consumo_acumulado_g?: number;

  @ApiPropertyOptional({
    example: 1.18,
    description: 'FCR objetivo a esa edad',
  })
  @IsNumber()
  @IsOptional()
  fcr_objetivo?: number;

  @ApiPropertyOptional({
    example: 'iniciacion',
    description: 'Etapa de alimentación, la misma lista que el catálogo.',
    enum: ETAPAS_ALIMENTACION,
  })
  @IsIn(ETAPAS_ALIMENTACION)
  @IsOptional()
  etapa_alimentacion?: string;

  @ApiPropertyOptional({
    example: 26,
    description: 'Temperatura minima ideal en grados C',
  })
  @IsNumber()
  @IsOptional()
  temperatura_min?: number;

  @ApiPropertyOptional({
    example: 26,
    description: 'Temperatura maxima ideal en grados C',
  })
  @IsNumber()
  @IsOptional()
  temperatura_max?: number;
}
