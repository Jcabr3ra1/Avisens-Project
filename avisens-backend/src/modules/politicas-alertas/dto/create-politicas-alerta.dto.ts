// ============================================================================
// RETROALIMENTACION (correcciones sobre la version original):
//  1. Se elimino 'politica_alerta_id': ese es el 'id' (llave primaria) y lo
//     genera la base de datos sola. Un DTO de CREAR nunca recibe el id.
//  2. Se agrego @IsOptional() a los campos que en el schema son opcionales
//     (nivel_escalamiento, canal, tiempo_max_respuesta_seg son Int?/String?).
//     Sin @IsOptional() la validacion los exigiria aunque el modelo permita null.
//  3. 'verificado' y 'activa' quedan opcionales porque tienen @default en el
//     schema (false y true); si no se envian, la base pone el valor por defecto.
//  4. Regla general: cada campo del DTO debe calzar EXACTO (nombre y tipo) con
//     el modelo PoliticaAlerta del schema.prisma.
// ============================================================================
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
