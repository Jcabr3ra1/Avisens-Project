import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { NombreUsuario } from '../../../common/auth/username';
import { Transform } from 'class-transformer';

/**
 * Los datos que hacen falta para volver cliente a un prospecto.
 *
 * El cuestionario ya recogió nombre, teléfono y a veces correo, así que el
 * formulario llega prellenado. Lo que nunca tiene es la cédula —no se pregunta
 * por chat—, el usuario y la contraseña, que se acuerdan en la llamada.
 * El correo es un dato de contacto opcional; no identifica el acceso.
 *
 * No lleva `rol_id`: convertir un prospecto siempre crea un Propietario. Y no
 * lleva `resultado`, porque convertir ya significa ganado; para lo demás está
 * `PATCH /:id/cerrar`.
 */
export class ConvertirProspectoDto {
  @ApiProperty({ example: 'María López' })
  @IsString()
  nombre_completo: string;

  @ApiProperty({
    example: '1098765432',
    description: 'La pide el asesor: el chatbot no la pregunta',
  })
  @IsString()
  cedula: string;

  @ApiProperty({ example: 'Clave123Seg', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'maria.lopez', minLength: 3, maxLength: 30 })
  @NombreUsuario()
  username: string;

  @ApiPropertyOptional({ example: 'maria@granja.com', nullable: true })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() || null : value,
  )
  @IsOptional()
  @IsEmail()
  email?: string | null;

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

  @ApiProperty({
    example: 'Granja La Esperanza',
    minLength: 2,
    maxLength: 120,
    description:
      'Obligatorio. Sin granja no hay galpones, sin galpones no hay lotes, y el ' +
      'cliente entra a una cuenta que no hace nada. El asesor está en la llamada: ' +
      'que pregunte el nombre real en vez de dejar una «Granja principal» vacía.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(2, 120)
  granja_nombre: string;

  @ApiPropertyOptional({
    example: 'Tuluá',
    description: 'Municipio de la granja. El cuestionario ya no lo pregunta.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsOptional()
  granja_municipio?: string;
}
