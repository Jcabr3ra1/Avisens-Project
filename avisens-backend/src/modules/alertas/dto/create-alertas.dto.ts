// ============================================================================
// RETROALIMENTACION (correcciones sobre la version original):
//  1. Nombres con DOBLE guion bajo -> UN solo guion, como en el schema:
//     'galpon__id' -> 'galpon_id', 'lote__id' -> 'lote_id', etc.
//  2. Se elimino 'alerta__id': una alerta NO pertenece a otra alerta, ese
//     campo no existe en el modelo Alerta.
//  3. Se elimino 'tipo_alerta__id': el modelo usa 'tipo' (String), no un id.
//  4. Tipos con MAYUSCULA (Number, String) -> minuscula (number, string).
//     Number/String en mayuscula son los objetos wrapper, no los tipos de TS.
//  5. Import: se quito 'isString' (minuscula, no es un validador y quedaba sin
//     usar -> rompe el lint). El validador correcto es 'IsString'.
//  6. Se agrego @IsOptional() a los campos que en el schema son opcionales.
//  7. Regla general: cada campo debe calzar EXACTO (nombre y tipo) con el
//     modelo Alerta del schema.prisma.
// ============================================================================
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAlertasDto {
  @ApiProperty({
    example: 1,
    description: 'Id del galpon donde se genera la alerta',
  })
  @IsInt()
  galpon_id: number;

  @ApiProperty({
    example: 'temperatura_alta',
    description: 'Tipo de alerta que se disparo',
  })
  @IsString()
  tipo: string;

  @ApiProperty({
    example: 'critica',
    description: 'Nivel de criticidad: baja | media | critica',
  })
  @IsString()
  criticidad: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Id del lote relacionado',
  })
  @IsInt()
  @IsOptional()
  lote_id?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Id del sensor que disparo la alerta',
  })
  @IsInt()
  @IsOptional()
  sensor_id?: number;

  @ApiPropertyOptional({
    example: 34.5,
    description: 'Valor medido que disparo la alerta',
  })
  @IsNumber()
  @IsOptional()
  valor_detectado?: number;

  @ApiPropertyOptional({
    example: 32,
    description: 'Valor umbral configurado que se supero',
  })
  @IsNumber()
  @IsOptional()
  valor_umbral?: number;

  @ApiPropertyOptional({
    example: 'Temperatura por encima del umbral permitido',
    description: 'Mensaje descriptivo de la alerta',
  })
  @IsString()
  @IsOptional()
  mensaje?: string;
}
