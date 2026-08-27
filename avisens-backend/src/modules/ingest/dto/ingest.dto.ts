import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  IsDateString,
  IsIP,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class LecturaDto {
  @ApiProperty({
    example: 'TEMP-G1-01',
    description: 'Código único del sensor que reporta',
  })
  @IsString()
  @MaxLength(100)
  codigo: string;

  @ApiProperty({ example: 24.8, description: 'Valor leído por el sensor' })
  @IsNumber()
  valor: number;

  @ApiPropertyOptional({
    enum: ['ok', 'sospechosa', 'error'],
    example: 'ok',
    description: 'Calidad de la lectura (por defecto ok)',
  })
  @IsIn(['ok', 'sospechosa', 'error'])
  @IsOptional()
  calidad?: string;
}

export class IngestDto {
  @ApiPropertyOptional({
    example: 'ad65a582-4ef3-48c9-b847-2f9f6a8c6186',
    description:
      'UUID estable del lote. Permite reintentar sin duplicar mediciones.',
  })
  @IsUUID()
  @IsOptional()
  id_lote?: string;

  @ApiPropertyOptional({
    example: '2026-08-25T14:32:00.000Z',
    description: 'Momento de captura informado por el dispositivo',
  })
  @IsDateString()
  @IsOptional()
  fecha_dispositivo?: string;

  @ApiProperty({
    type: [LecturaDto],
    description: 'Lecturas del ciclo (una por sensor)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique((lectura: LecturaDto) => lectura.codigo)
  @ValidateNested({ each: true })
  @Type(() => LecturaDto)
  lecturas: LecturaDto[];

  @ApiPropertyOptional({
    example: '192.168.1.42',
    description: 'IP local del nodo en la red WiFi (opcional)',
  })
  @IsIP()
  @IsOptional()
  ip_local?: string;
}
