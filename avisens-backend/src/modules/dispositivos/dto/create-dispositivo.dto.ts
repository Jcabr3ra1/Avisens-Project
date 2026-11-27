import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsIP,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import {
  CodigoAlfanumerico,
  NombreEntidad,
  PATRON_VERSION,
} from '../../../common/validation/texto';

export class CreateDispositivoDto {
  @ApiProperty({
    example: 1,
    description: 'ID del galpon donde esta instalado',
  })
  @IsInt()
  @Min(1)
  galpon_id: number;

  @ApiPropertyOptional({
    example: 'galpon1',
    description:
      'Código único del nodo; si se omite se genera como GAL-000027-ESP32-001 con consecutivo por galpón',
  })
  @IsOptional()
  @CodigoAlfanumerico('El código del nodo', 60, false)
  codigo_topic?: string;

  @ApiPropertyOptional({
    example: 'Nodo entrada norte',
    description:
      'Nombre visible; si se omite se usa el código generado del nodo',
  })
  @IsOptional()
  @NombreEntidad('El nombre del dispositivo', 120, false)
  nombre?: string;

  @ApiPropertyOptional({
    example: '1.0.3',
    description: 'Version del firmware',
  })
  @IsString()
  @MaxLength(30)
  @Matches(PATRON_VERSION, {
    message: 'La versión de firmware debe seguir formato semántico (ej.: 1.0.3)',
  })
  @IsOptional()
  version_firmware?: string;

  @ApiPropertyOptional({
    example: '192.168.1.42',
    description: 'IP en la red wifi local',
  })
  @IsIP(undefined, {
    message: 'La IP local debe ser una dirección IP válida',
  })
  @IsOptional()
  ip_local?: string;
}
