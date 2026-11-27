import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, MinLength } from 'class-validator';
import {
  NitColombiano,
  NombreEntidad,
} from '../../../common/validation/texto';

export class CreateOrganizacionDto {
  @ApiProperty({ example: 'Avícola La Esperanza' })
  @NombreEntidad('El nombre de la organización', 120, true)
  @MinLength(2)
  nombre: string;

  @ApiPropertyOptional({ example: '900123456-7' })
  @NitColombiano()
  @IsOptional()
  nit?: string;

  @ApiPropertyOptional({
    example: 'free',
    enum: ['free', 'basic', 'pro', 'enterprise'],
  })
  @IsIn(['free', 'basic', 'pro', 'enterprise'])
  @IsOptional()
  plan?: string;
}
