import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  TextoSeguro,
  UrlHttpSegura,
} from '../../../common/validation/texto';

const TIPOS_EVIDENCIA = ['foto', 'video', 'documento', 'otro'] as const;

export class CreateEvidenciaAlertaDto {
  @ApiProperty({
    example: 1,
    description: 'ID de la alerta a la que pertenece la evidencia',
  })
  @IsInt()
  @Min(1)
  alerta_id: number;

  @ApiPropertyOptional({
    example: 'foto',
    enum: TIPOS_EVIDENCIA,
    description: 'Tipo de evidencia: foto | video | documento | otro',
  })
  @IsIn(TIPOS_EVIDENCIA, {
    message: 'El tipo de evidencia debe ser foto, video, documento u otro',
  })
  @IsOptional()
  tipo_evidencia?: string;

  @ApiPropertyOptional({
    example: 'https://servidor.com/evidencias/alerta-1.jpg',
    description: 'URL del archivo almacenado',
  })
  @UrlHttpSegura('El enlace de la evidencia', 500)
  @IsOptional()
  archivo_url?: string;

  @ApiPropertyOptional({
    example: 'Se adjuntó fotografía del sensor afectado',
    description: 'Comentario asociado a la evidencia',
  })
  @TextoSeguro('El comentario', 500, { multilinea: true })
  @IsOptional()
  comentario?: string;

  @ApiPropertyOptional({
    example: 245760,
    description: 'Tamaño del archivo en bytes',
  })
  @IsInt()
  @Min(0)
  @Max(20_000_000)
  @IsOptional()
  tamano_bytes?: number;
}
