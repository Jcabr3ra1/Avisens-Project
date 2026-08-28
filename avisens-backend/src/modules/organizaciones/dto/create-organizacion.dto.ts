import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateOrganizacionDto {
  @ApiProperty({ example: 'Avícola La Esperanza' })
  @IsString()
  @MinLength(2)
  nombre: string;

  @ApiPropertyOptional({ example: '900123456-7' })
  @IsString()
  @MinLength(3)
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
