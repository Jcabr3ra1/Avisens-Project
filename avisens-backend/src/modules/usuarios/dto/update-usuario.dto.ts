import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateUsuarioDto } from './create-usuario.dto';

export class UpdateUsuarioDto extends PartialType(
  OmitType(CreateUsuarioDto, [
    'organizacion_id',
    'organizacion_nombre',
  ] as const),
) {
  @ApiPropertyOptional({
    example: true,
    description: 'Activar o desactivar la cuenta',
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
