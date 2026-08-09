import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateEventoSanitarioDto {
  @ApiProperty({ example: 1, description: 'ID del lote' })
  @IsInt()
  lote_id: number;

  @ApiProperty({
    example: 'vacunacion',
    description:
      'Tipo de evento: vacunacion | medicacion | tratamiento | diagnostico | revision',
  })
  @IsString()
  tipo: string;

  @ApiProperty({ example: '2026-08-09', description: 'Fecha del evento' })
  @IsDateString()
  fecha: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'ID del insumo del inventario usado (vacuna/medicamento)',
  })
  @IsInt()
  @IsOptional()
  insumo_id?: number;

  @ApiPropertyOptional({
    example: 'Newcastle',
    description: 'Enfermedad diagnosticada (texto libre)',
  })
  @IsString()
  @IsOptional()
  diagnostico?: string;

  @ApiPropertyOptional({
    example: 'Vacuna Newcastle La Sota',
    description: 'Producto aplicado',
  })
  @IsString()
  @IsOptional()
  producto?: string;

  @ApiPropertyOptional({
    example: '0.5 ml por ave',
    description: 'Dosis aplicada',
  })
  @IsString()
  @IsOptional()
  dosis?: string;

  @ApiPropertyOptional({
    example: 'ocular',
    description:
      'Via de aplicacion: ocular | oral | agua | subcutanea | intramuscular',
  })
  @IsString()
  @IsOptional()
  via_aplicacion?: string;

  @ApiPropertyOptional({
    example: 500,
    description: 'A cuantas aves se aplico',
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  cantidad_aves?: number;

  @ApiPropertyOptional({ example: 'manual', description: 'Como se registro' })
  @IsString()
  @IsOptional()
  metodo_registro?: string;

  @ApiPropertyOptional({ example: 'Aplicada por la manana antes del alimento' })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
