import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateGranjaDto } from './create-granja.dto';

export class UpdateGranjaDto extends PartialType(CreateGranjaDto) {
  @ApiPropertyOptional({
    example: true,
    description: 'Activar o desactivar la granja',
  })
  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}
