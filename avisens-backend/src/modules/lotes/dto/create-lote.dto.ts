import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateLoteDto {
  @ApiProperty({
    example: 1,
    description: 'ID del galpón al que pertenece el lote',
  })
  @IsInt()
  @Min(1)
  galpon_id: number;

  @ApiProperty({
    example: 1,
    description: 'ID del proveedor que vendio los pollitos',
  })
  @IsInt()
  @Min(1)
  proveedor_id: number;

  @ApiProperty({
    example: 'LOTE-2026-01',
    description: 'Codigo unico del lote',
  })
  @IsString()
  codigo: string;

  @ApiProperty({
    example: '2026-08-06',
    description: 'Fecha de ingreso de las aves',
  })
  @IsDateString()
  fecha_ingreso: string;

  @ApiProperty({
    example: 5000,
    description: 'Cantidad de aves que ingresaron',
  })
  @IsInt()
  @IsPositive()
  cantidad_inicial: number;

  @ApiPropertyOptional({ example: 'Ross 308', description: 'Raza de las aves' })
  @IsString()
  @IsOptional()
  raza?: string;

  @ApiPropertyOptional({
    example: 'mixto',
    description: 'Sexo del lote (macho, hembra, mixto)',
  })
  @IsString()
  @IsOptional()
  sexo?: string;

  @ApiPropertyOptional({
    example: 'italcol',
    description:
      'Marca de alimento del lote: italcol | solla | contegral | finca',
  })
  @IsString()
  @IsOptional()
  marca_alimento?: string;

  @ApiPropertyOptional({
    example: 1200,
    description: 'Costo unitario de cada pollito (COP)',
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  costo_pollito_unitario?: number;

  @ApiPropertyOptional({
    example: 6000000,
    description: 'Presupuesto total del lote (COP)',
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  presupuesto_total_cop?: number;

  @ApiPropertyOptional({
    example: '2026-10-15',
    description: 'Fecha estimada de salidad de las aves',
  })
  @IsDateString()
  @IsOptional()
  fecha_salida_estimada?: string;
}
