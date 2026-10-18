import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  IsDateString,
  IsIP,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsPositive,
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

// Lo que pasó con una orden remota que el ESP32 recibió en una respuesta
// anterior de /ingest.
export class ResultadoOrdenDto {
  @ApiProperty({ example: 41, description: 'ID de la orden (OrdenActuador)' })
  @IsInt()
  @IsPositive()
  orden_id: number;

  @ApiProperty({
    enum: ['aplicada', 'rechazada', 'revertida'],
    example: 'aplicada',
    description:
      'aplicada / rechazada al recibirla; revertida si después el ESP32 devolvió el relé a automático',
  })
  @IsIn(['aplicada', 'rechazada', 'revertida'])
  resultado: 'aplicada' | 'rechazada' | 'revertida';

  @ApiPropertyOptional({
    example: true,
    description: 'Estado real del relé después de procesar la orden',
  })
  @IsBoolean()
  @IsOptional()
  estado_rele?: boolean;

  @ApiPropertyOptional({
    example: 'DHT22 en error: el clima lo gobierna el fail-safe',
    description: 'Por qué el ESP32 la rechazó o la revirtió',
  })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  motivo?: string;
}

// Lo que el ESP32 tiene AHORA en un relé: modo y salida, se haya fijado desde
// la web, desde el monitor serie o por la lógica automática.
export class EstadoReleDto {
  @ApiProperty({ example: 'REL-K2-G1-01', description: 'Código del relé' })
  @IsString()
  @MaxLength(100)
  codigo: string;

  @ApiProperty({
    enum: ['automatico', 'manual_remoto', 'manual_local'],
    example: 'manual_remoto',
  })
  @IsIn(['automatico', 'manual_remoto', 'manual_local'])
  modo: 'automatico' | 'manual_remoto' | 'manual_local';

  @ApiProperty({ example: true, description: 'Salida que el ESP32 ordenó al relé' })
  @IsBoolean()
  encendido: boolean;

  @ApiPropertyOptional({
    example: 42,
    description: 'Orden web que mantiene el relé en manual (solo en manual_remoto)',
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  orden_id?: number;
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

  @ApiPropertyOptional({
    example: '0b6f8a52-3c1e-4d7a-9f20-6a1d2b3c4e5f',
    description:
      'UUID que el ESP32 genera en cada arranque. Uno nuevo indica un reinicio: las órdenes sin confirmar de la sesión anterior pasan a "incierta". Si falta (firmware anterior), no se detectan reinicios.',
  })
  @IsUUID()
  @IsOptional()
  arranque_id?: string;

  @ApiPropertyOptional({
    type: [ResultadoOrdenDto],
    description: 'Confirmaciones de órdenes remotas recibidas antes',
  })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ResultadoOrdenDto)
  @IsOptional()
  resultados_ordenes?: ResultadoOrdenDto[];

  @ApiPropertyOptional({
    type: [EstadoReleDto],
    description:
      'Modo y salida actuales de cada relé K1-K4. Si falta (firmware anterior), no se actualiza el estado ni se reconcilia nada.',
  })
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique((e: EstadoReleDto) => e.codigo)
  @ValidateNested({ each: true })
  @Type(() => EstadoReleDto)
  @IsOptional()
  estados_reles?: EstadoReleDto[];
}
