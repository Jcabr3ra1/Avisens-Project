import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

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
  @IsString()
  codigo_topic?: string;

  @ApiPropertyOptional({
    example: 'Nodo entrada norte',
    description:
      'Nombre visible; si se omite se usa el código generado del nodo',
  })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({
    example: '1.0.3',
    description: 'Version del firmware',
  })
  @IsString()
  @IsOptional()
  version_firmware?: string;

  @ApiPropertyOptional({
    example: '192.168.1.42',
    description: 'IP en la red wifi local',
  })
  @IsString()
  @IsOptional()
  ip_local?: string;
}
