import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CrearProspectoWebDto {
  @ApiProperty({ example: 'María González' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ example: '3001234567' })
  @IsString()
  @Matches(/^[+0-9()\s-]{7,20}$/)
  telefono: string;

  @ApiProperty({ example: 'Piedecuesta' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  municipio: string;

  @ApiProperty({ example: 'Pollo de engorde' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
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
