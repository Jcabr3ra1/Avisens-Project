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
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
  type ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'identidadLectura', async: false })
export class IdentidadLectura implements ValidatorConstraintInterface {
  validate(_valor: unknown, args: ValidationArguments) {
    const lectura = args.object as LecturaDto;
    const porCodigo =
      typeof lectura.codigo === 'string' && lectura.codigo.trim().length > 0;
    const porConexion =
      typeof lectura.tipo === 'string' &&
      /^[a-z][a-z0-9_]{0,49}$/.test(lectura.tipo) &&
      typeof lectura.canal === 'string' &&
      /^gpio:(0|[1-9]\d*)$/.test(lectura.canal);
    return (
      (porCodigo &&
        lectura.tipo === undefined &&
        lectura.canal === undefined) ||
      (porConexion && lectura.codigo === undefined)
    );
  }

  defaultMessage() {
    return 'Cada lectura requiere codigo o el par tipo/canal, sin mezclar identidades';
  }
}

export class LecturaDto {
  @ApiPropertyOptional({
    example: 'TEMP-G1-01',
    description: 'Código único del sensor que reporta',
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  codigo?: string;

  @ApiPropertyOptional({ example: 'temperatura' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipo?: string;

  @ApiPropertyOptional({
    example: 'gpio:18',
    description: 'Conexión estable del sensor en el controlador',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  canal?: string;

  @ApiProperty({ example: 24.8, description: 'Valor leído por el sensor' })
  @IsNumber()
  @Validate(IdentidadLectura)
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
  @ArrayUnique((lectura: LecturaDto) =>
    lectura.codigo !== undefined
      ? `codigo:${lectura.codigo}`
      : `conexion:${lectura.tipo}:${lectura.canal}`,
  )
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
