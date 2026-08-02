import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateGalponDto } from './create-galpon.dto';

export class UpdateGalponDto extends PartialType(CreateGalponDto) {
  @ApiPropertyOptional({
    example: true,
    description: 'Activar o desactivar el galpón',
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
