import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateEvidenciaAlertaDto {
  @ApiProperty({
    example: 1,
    description: 'ID de la alerta a la que pertenece la evidencia',
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
  @IsOptional()
  archivo_url?: string;

  @ApiPropertyOptional({
    example: 'Se adjuntó fotografía del sensor afectado',
    description: 'Comentario asociado a la evidencia',
  })
  @IsString()
  @IsOptional()
  comentario?: string;

  @ApiPropertyOptional({
    example: 245760,
    description: 'Tamaño del archivo en bytes',
  })
  @IsInt()
  @IsOptional()
  tamano_bytes?: number;
}
