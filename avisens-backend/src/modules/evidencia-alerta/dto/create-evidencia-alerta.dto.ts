import { Optional } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateEvidenciaAlertaDto {
  @ApiProperty({
    example: 1,
    description: 'ID de la alerta ala que pertenece la evidencia',
  })
  @IsInt()
  alerta_id: number;

  @ApiPropertyOptional({
    example: 'foto',
    description: 'Tipo de evidencia: foto | video | documento | otro',
  })
  @IsString()
  @IsOptional()
  tipo_evidencia?: string;

  @ApiPropertyOptional({
    example: 'https://servidor.com/evidencias/alerta-1.jpg',
    description: 'URL del archivo almacenado',
  })
  @IsString()
  @Optional()
  archivo_url?: string;

  @ApiPropertyOptional({
    example: 'Se adjunto fotografía del sensor afectado',
    description: 'Comentario asociado a la evidencia',
  })
  @IsString()
  @Optional()
  comentario?: string;

  @ApiPropertyOptional({
    example: 245760,
    description: 'Tamaño del archivo en bytes',
  })
  @IsInt()
  @IsOptional()
  tamano_bytes?: number;
}
