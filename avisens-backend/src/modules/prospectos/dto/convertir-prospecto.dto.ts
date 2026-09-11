import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Los datos que hacen falta para volver cliente a un prospecto.
 *
 * El cuestionario ya recogió nombre, teléfono y a veces correo, así que el
 * formulario llega prellenado. Lo que nunca tiene es la cédula —no se pregunta
 * por chat— y la contraseña, que se acuerdan en la llamada. El correo es
 * obligatorio porque es con lo que el cliente entra, y por WhatsApp no se pide:
 * si el prospecto llegó por ahí, hay que preguntárselo.
 *
 * No lleva `rol_id`: convertir un prospecto siempre crea un Propietario. Y no
 * lleva `resultado`, porque convertir ya significa ganado; para lo demás está
 * `PATCH /:id/cerrar`.
 */
export class ConvertirProspectoDto {
  @ApiProperty({ example: 'María López' })
  @IsString()
  nombre_completo: string;

  @ApiProperty({ example: '1098765432', description: 'La pide el asesor: el chatbot no la pregunta' })
  @IsString()
  cedula: string;

  @ApiProperty({ example: 'Clave123Seg', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: 'maria@granja.com',
    description:
      'Con este correo entra el cliente, así que es obligatorio. El chatbot lo ' +
      'pregunta por la web pero no por WhatsApp: si el prospecto no lo trae, se pide.',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '573001234567' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({
    example: 'Avícola La Esperanza',
    description:
      'Nombre de la organización del cliente. Si no viene, se usa «Organización de {nombre}».',
  })
  @IsString()
  @IsOptional()
  organizacion_nombre?: string;
}
