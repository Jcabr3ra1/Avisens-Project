// dto/update-alertas.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { EstadoAlerta } from '@prisma/client';

export class UpdateAlertasDto {
  @ApiPropertyOptional({
    example: EstadoAlerta.en_proceso,
    enum: EstadoAlerta,
    description: 'Estado de la alerta',
  })
  @IsEnum(EstadoAlerta)
  @IsOptional()
  estado?: EstadoAlerta;

  @ApiPropertyOptional({
    example: 'Se ajustó la ventilación',
    description: 'Acción correctiva tomada',
  })
  @IsString()
  @IsOptional()
  accion_correctiva?: string;

  @ApiPropertyOptional({
    example: 2,
    nullable: true,
    description:
      'ID del usuario responsable. null lo desasigna (@IsOptional deja pasar null)',
  })
  @IsInt()
  @IsOptional()
  responsable_id?: number | null;

  @ApiPropertyOptional({
    example: 3,
    nullable: true,
    description:
      'ID del usuario a quien se escaló. null lo desasigna (@IsOptional deja pasar null)',
  })
  @IsInt()
  @IsOptional()
  escalado_a_id?: number | null;

  @ApiPropertyOptional({
    example: '2024-01-15T10:30:00Z',
    description: 'Fecha de aceptación de la alerta',
  })
  @IsString()
  @IsOptional()
  fecha_aceptacion?: string;

  @ApiPropertyOptional({
    example: '2024-01-15T14:00:00Z',
    description: 'Fecha de cierre de la alerta',
  })
  @IsString()
  @IsOptional()
  fecha_cierre?: string;
}
