import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsDateString,
  IsIn,
} from 'class-validator';

export class CreateMedicionDto {
  @ApiProperty({
    example: 1,
    description: 'ID del sensor que reporta la lectura',
  })
  @IsInt()
  sensor_id: number;

  @ApiProperty({ example: 27.5, description: 'Valor leído por el sensor' })
  @IsNumber()
  valor: number;

  @ApiPropertyOptional({
    example: '2026-07-25T14:30:00Z',
    description:
      'Instante de la lectura. Si se omite, se usa la hora del servidor',
  })
  @IsDateString()
  @IsOptional()
  fecha_hora?: string;

  @ApiPropertyOptional({
    example: 'ok',
    enum: ['ok', 'sospechosa', 'error'],
    description: 'Calidad de la lectura',
  })
  @IsIn(['ok', 'sospechosa', 'error'])
  @IsOptional()
  calidad?: string;
}
