import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { NombreUsuario } from '../../../common/auth/username';
import {
  CodigoAlfanumerico,
  NombreEntidad,
  NombrePersona,
  TelefonoColombiano,
} from '../../../common/validation/texto';

/**
 * Los datos que hacen falta para volver cliente a un prospecto.
 */
export class ConvertirProspectoDto {
  @ApiProperty({ example: 'María López' })
  @NombrePersona(120)
  nombre_completo: string;

  @ApiProperty({
    example: '1098765432',
    description: 'La pide el asesor: el chatbot no la pregunta',
  })
  @CodigoAlfanumerico('La cédula', 40)
  cedula: string;

  @ApiProperty({ example: 'Clave123Seg', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
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
  @MaxLength(150)
  email?: string | null;

  @ApiPropertyOptional({ example: '573001234567' })
  @IsOptional()
  @TelefonoColombiano(true)
  telefono?: string;

  @ApiPropertyOptional({
    example: 'Avícola La Esperanza',
    description:
      'Nombre de la organización del cliente. Si no viene, se usa «Organización de {nombre}».',
  })
  @IsOptional()
  @NombreEntidad('El nombre de la organización', 120, false)
  organizacion_nombre?: string;

  @ApiProperty({
    example: 'Granja La Esperanza',
    minLength: 2,
    maxLength: 120,
  })
  @NombreEntidad('El nombre de la granja', 120, true)
  @MinLength(2)
  granja_nombre: string;

  @ApiPropertyOptional({
    example: 'Tuluá',
    description: 'Municipio de la granja.',
  })
  @IsOptional()
  @NombreEntidad('El municipio', 100, false)
  granja_municipio?: string;
}
