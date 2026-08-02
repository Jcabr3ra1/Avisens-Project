import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateDispositivoDto } from './create-dispositivo.dto';

export class UpdateDispositivoDto extends PartialType(CreateDispositivoDto) {
  @ApiPropertyOptional({
    example: true,
    description: 'Indica si el dispositivo esta activo o no',
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
