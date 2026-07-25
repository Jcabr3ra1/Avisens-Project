import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateProveedorDto {
  @ApiProperty({ example: 'Alimentos del Campo S.A.S' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: '900123456-7', description: 'NIT (único)' })
  @IsString()
  nit: string;

  @ApiPropertyOptional({
    example: 'alimento',
    description: 'Tipo de proveedor (alimento, pollito, insumo, servicio…)',
  })
  @IsString()
  @IsOptional()
  tipo_proveedor?: string;

  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsString()
  @IsOptional()
  contacto_persona?: string;

  @ApiPropertyOptional({ example: '3001234567' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({ example: 'ventas@alimentos.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Calle 10 #20-30, Bogotá' })
  @IsString()
  @IsOptional()
  direccion?: string;
}
