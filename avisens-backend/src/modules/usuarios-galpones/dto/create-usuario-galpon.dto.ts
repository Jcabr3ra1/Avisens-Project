import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type, type TransformFnParams } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class CreateUsuarioGalponDto {
  @ApiProperty({ example: 1, description: 'ID del usuario a asignar' })
  @IsInt()
  usuario_id: number;

  @ApiProperty({ example: 1, description: 'ID del galpón' })
  @IsInt()
  galpon_id: number;

  @ApiPropertyOptional({
    example: 'galponero',
    description: 'Rol en la asignación: galponero | supervisor | tecnico',
  })
  @IsString()
  @IsIn(['galponero', 'supervisor', 'tecnico'])
  @IsOptional()
  rol_asignacion?: string;
}

export class ListarUsuarioGalponDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Filtrar por usuario' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  usuario_id?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filtrar por galpón' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  galpon_id?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Solo asignaciones activas',
  })
  @Transform(({ value }: TransformFnParams): unknown => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as unknown;
  })
  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}
