import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, MaxLength } from 'class-validator';
import {
  NombreEntidad,
  NombrePersona,
  TelefonoColombiano,
} from '../../../common/validation/texto';

export class CrearProspectoWebDto {
  @ApiProperty({ example: 'María González' })
  @NombrePersona(100)
  nombre: string;

  @ApiProperty({ example: '3001234567' })
  @TelefonoColombiano(true)
  telefono: string;

  @ApiProperty({ example: 'Piedecuesta' })
  @NombreEntidad('El municipio', 100, true)
  municipio: string;

  @ApiProperty({ example: 'Pollo de engorde' })
  @NombreEntidad('El tipo de producción', 100, true)
  tipo_produccion: string;

  @ApiPropertyOptional({ example: 'maria@granja.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  consentimiento_habeas_data: boolean;
}
