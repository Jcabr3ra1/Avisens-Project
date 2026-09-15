import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrigenAlerta } from '@prisma/client';

class GranjaEnAlertaDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Granja A' })
  nombre: string;

  @ApiProperty({ example: 5 })
  propietario_id: number;
}

class GalponEnAlertaDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Galpón Norte' })
  nombre: string;

  @ApiProperty({ example: 'GA-1' })
  codigo: string;

  @ApiProperty({ type: GranjaEnAlertaDto })
  granja: GranjaEnAlertaDto;
}

class LoteEnAlertaDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'L-2026-01' })
  codigo: string;

  @ApiProperty({ example: 'activo' })
  estado: string;
}

class SensorEnAlertaDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: 'TEMP-G1-01' })
  codigo: string;

  @ApiProperty({ example: 'temperatura' })
  tipo: string;
}

class UsuarioEnAlertaDto {
  @ApiProperty({ example: 8 })
  id: number;

  @ApiProperty({ example: 'Juan Pérez' })
  nombre_completo: string;

  @ApiProperty({ example: 'juan@avisens.com' })
  email: string;
}

export class AlertaRespuestaDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 1 })
  galpon_id: number;

  @ApiPropertyOptional({ example: 1, nullable: true })
  lote_id: number | null;

  @ApiPropertyOptional({ example: 3, nullable: true })
  sensor_id: number | null;

  @ApiProperty({ example: 'temperatura' })
  tipo: string;

  @ApiProperty({
    enum: OrigenAlerta,
    example: OrigenAlerta.automatica,
    description:
      "Quién generó la alerta: 'automatica' (evaluarLectura), 'manual' (creada por un usuario), o 'desconocido' (histórico anterior a este campo, sin evidencia comprobable para reclasificar).",
  })
  origen: OrigenAlerta;

  @ApiProperty({ example: 'alta', enum: ['baja', 'media', 'alta'] })
  criticidad: string;

  @ApiPropertyOptional({ example: 35.2, nullable: true })
  valor_detectado: number | null;

  @ApiPropertyOptional({ example: 30, nullable: true })
  valor_umbral: number | null;

  @ApiPropertyOptional({
    example: 'Temperatura fuera del rango seguro en Galpón Norte.',
    nullable: true,
  })
  mensaje: string | null;

  @ApiProperty({
    example: 'abierta',
    enum: ['abierta', 'en_proceso', 'cerrada'],
  })
  estado: string;

  @ApiPropertyOptional({ example: 8, nullable: true })
  responsable_id: number | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  escalado_a_id: number | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  accion_correctiva: string | null;

  @ApiProperty({ example: '2026-09-14T12:00:00.000Z' })
  fecha_creacion: Date;

  @ApiPropertyOptional({ example: null, nullable: true })
  fecha_aceptacion: Date | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  fecha_cierre: Date | null;

  @ApiProperty({ type: GalponEnAlertaDto })
  galpon: GalponEnAlertaDto;

  @ApiPropertyOptional({ type: LoteEnAlertaDto, nullable: true })
  lote: LoteEnAlertaDto | null;

  @ApiPropertyOptional({ type: SensorEnAlertaDto, nullable: true })
  sensor: SensorEnAlertaDto | null;

  @ApiPropertyOptional({ type: UsuarioEnAlertaDto, nullable: true })
  responsable: UsuarioEnAlertaDto | null;

  @ApiPropertyOptional({ type: UsuarioEnAlertaDto, nullable: true })
  escalado_a: UsuarioEnAlertaDto | null;
}
