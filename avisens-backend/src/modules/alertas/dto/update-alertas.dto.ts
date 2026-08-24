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
    description: 'ID del usuario responsable de la alerta',
  })
  @IsInt()
  @IsOptional()
  responsable_id?: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'ID del usuario a quien se escaló la alerta',
  })
  @IsInt()
  @IsOptional()
  escalado_a_id?: number;

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
