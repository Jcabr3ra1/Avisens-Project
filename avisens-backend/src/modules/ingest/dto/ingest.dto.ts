import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

// Una lectura de un sensor. El dispositivo se identifica por el CÓDIGO del
// sensor (ej. TEMP-G1-01), nunca por un id numérico de la BD.
export class LecturaDto {
  @ApiProperty({
    example: 'TEMP-G1-01',
    description: 'Código único del sensor que reporta',
  })
  @IsString()
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

// Cuerpo de POST /ingest: un lote de lecturas del ciclo. El DHT22 manda
// temperatura y humedad en un solo POST, por eso es un arreglo.
export class IngestDto {
  @ApiProperty({
    type: [LecturaDto],
    description: 'Lecturas del ciclo (una por sensor)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LecturaDto)
  lecturas: LecturaDto[];

  @ApiPropertyOptional({
    example: '192.168.1.42',
    description: 'IP local del nodo en la red WiFi (opcional)',
  })
  @IsString()
  @IsOptional()
  ip_local?: string;
}
