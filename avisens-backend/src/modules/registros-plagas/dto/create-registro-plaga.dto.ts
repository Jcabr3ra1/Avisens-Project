import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateRegistroPlagaDto {
  @ApiProperty({ example: 1, description: 'ID del lote' })
  @IsInt()
  lote_id: number;

  @ApiProperty({ example: '2026-08-09', description: 'Fecha de la deteccion' })
  @IsDateString()
  fecha: string;

  @ApiProperty({
    example: 'roedores',
    description:
      'Tipo de plaga: roedores | insectos | acaros | escarabajos | otros',
  })
  @IsString()
  tipo_plaga: string;

  @ApiPropertyOptional({
    example: 3,
    description: 'ID del insumo usado para el control (inventario_insumos)',
  })
  @IsInt()
  @IsOptional()
  insumo_id?: number;

  @ApiPropertyOptional({
    example: 'Presencia de ratones en el area de alimento',
    description: 'Descripcion de la plaga',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({
    example: 'Cebos y sellado de accesos',
    description: 'Control aplicado',
  })
  @IsString()
  @IsOptional()
  control_aplicado?: string;

  @ApiPropertyOptional({ example: 'manual', description: 'Como se registro' })
  @IsString()
  @IsOptional()
  metodo_registro?: string;

  @ApiPropertyOptional({ example: 'Revisar de nuevo en 3 dias' })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
