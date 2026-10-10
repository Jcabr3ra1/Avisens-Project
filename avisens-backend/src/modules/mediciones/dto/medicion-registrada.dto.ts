import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MedicionRegistradaDto {
  @ApiProperty({
    example: '42',
    description: 'Id de la medición (BigInt en la base, viaja como texto)',
  })
  id: string;

  @ApiProperty({ example: 1 })
  sensor_id: number;

  @ApiProperty({ example: '2026-07-25T14:30:00.000Z' })
  fecha_hora: Date;

  @ApiProperty({ example: 27.5 })
  valor: number;

  @ApiProperty({ example: 'ok' })
  calidad: string;

  @ApiPropertyOptional({
    example:
      'No se pudo completar el procesamiento de alertas para esta lectura',
    description:
      'Presente solo si el procesamiento de alertas lanzó una excepción. La medición ya quedó guardada de todas formas.',
  })
  advertencia_evaluacion?: string;
}
