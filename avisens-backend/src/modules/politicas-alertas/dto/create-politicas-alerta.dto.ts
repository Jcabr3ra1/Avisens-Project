import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreatePoliticasAlertaDto {
  @ApiProperty({ example: 1, description: 'Id de la granja a la que aplica' })
  @IsInt()
  granja_id: number;

  @ApiProperty({
    example: 'Alta',
    description: 'Nivel de criticidad: Baja | Media | Alta',
  })
  @IsString()
  criticidad: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'Nivel de escalamiento asignado',
  })
  @IsInt()
  @IsOptional()
  nivel_escalamiento?: number;

  @ApiPropertyOptional({
    example: 'WhatsApp',
    description: 'Canal de notificacion: WhatsApp | Email | SMS',
  })
  @IsString()
  @IsOptional()
  canal?: string;

  @ApiPropertyOptional({
    example: 900,
    description: 'Tiempo maximo de respuesta en segundos antes de escalar',
  })
  @IsInt()
  @IsOptional()
  tiempo_max_respuesta_seg?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Si la politica ya fue verificada',
  })
  @IsBoolean()
  @IsOptional()
  verificado?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Si la politica esta activa',
  })
  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}
