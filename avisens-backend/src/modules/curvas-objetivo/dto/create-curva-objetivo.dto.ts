import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCurvaObjetivoDto {
  @ApiProperty({ example: 'macho', description: 'Sexo: macho | hembra' })
  @IsIn(['macho', 'hembra'])
  sexo: string;

  @ApiProperty({ example: 21, description: 'Dia de vida del pollo' })
  @IsInt()
  dia: number;

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
    description: 'Etapa: preiniciador | iniciacion | engorde',
  })
  @IsString()
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
