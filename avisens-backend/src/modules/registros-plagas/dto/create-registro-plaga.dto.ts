import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { TextoSeguro } from '../../../common/validation/texto';

export class CreateRegistroPlagaDto {
  @ApiProperty({ example: 1, description: 'ID del lote' })
  @IsInt()
  @Min(1)
  lote_id: number;

  @ApiProperty({ example: '2026-08-09', description: 'Fecha de la deteccion' })
  @IsDateString()
  fecha: string;

  @ApiProperty({
    example: 'roedores',
    description:
      'Tipo de plaga: roedores | insectos | acaros | escarabajos | otros',
  })
  @TextoSeguro('El tipo de plaga', 50, { requerido: true })
  tipo_plaga: string;

  @ApiPropertyOptional({
    example: 3,
    description: 'ID del insumo usado para el control (inventario_insumos)',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  insumo_id?: number;

  @ApiPropertyOptional({
    example: 'Presencia de ratones en el area de alimento',
    description: 'Descripcion de la plaga',
  })
  @IsOptional()
  @TextoSeguro('La descripción', 500, { multilinea: true })
  descripcion?: string;

  @ApiPropertyOptional({
    example: 'Cebos y sellado de accesos',
    description: 'Control aplicado',
  })
  @IsOptional()
  @TextoSeguro('El control aplicado', 300, { multilinea: true })
  control_aplicado?: string;

  @ApiPropertyOptional({ example: 'manual', description: 'Como se registro' })
  @IsOptional()
  @TextoSeguro('El método de registro', 40)
  metodo_registro?: string;

  @ApiPropertyOptional({ example: 'Revisar de nuevo en 3 dias' })
  @IsOptional()
  @TextoSeguro('Las observaciones', 500, { multilinea: true })
  observaciones?: string;
}
