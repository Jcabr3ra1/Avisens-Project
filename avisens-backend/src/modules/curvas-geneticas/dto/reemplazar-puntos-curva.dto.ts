import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Min,
  ValidateNested,
} from 'class-validator';

export class PuntoCurvaGeneticaDto {
  @ApiProperty({ example: 7, description: 'Día de vida (1 = primer día)' })
  @IsInt()
  @Min(1)
  dia: number;

  @ApiProperty({ example: 211, description: 'Peso esperado ese día (g)' })
  @IsNumber()
  @IsPositive()
  peso_esperado_g: number;

  @ApiPropertyOptional({
    example: 24,
    description: 'Consumo de alimento ese día (g/ave)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  consumo_diario_g?: number;

  @ApiPropertyOptional({
    example: 164,
    description: 'Consumo acumulado de alimento hasta ese día (g/ave)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  consumo_acumulado_g?: number;

  @ApiPropertyOptional({ example: 0.78, description: 'FCR objetivo acumulado' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  fcr_objetivo?: number;
}

export class ReemplazarPuntosCurvaDto {
  @ApiProperty({ type: [PuntoCurvaGeneticaDto] })
  @ValidateNested({ each: true })
  @Type(() => PuntoCurvaGeneticaDto)
  puntos: PuntoCurvaGeneticaDto[];
}
