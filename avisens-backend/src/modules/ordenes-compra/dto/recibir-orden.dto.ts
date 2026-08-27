import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ItemRecepcionOrdenDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  detalle_id: number;

  @ApiProperty({ example: 25 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  cantidad: number;
}

export class RecibirOrdenDto {
  @ApiProperty({
    example: 'recepcion-OC-001-20260825-01',
    description: 'Clave única del intento; repetirla no duplica el stock',
  })
  @IsString()
  @MaxLength(100)
  clave_idempotencia: string;

  @ApiProperty({ type: [ItemRecepcionOrdenDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemRecepcionOrdenDto)
  items: ItemRecepcionOrdenDto[];

  @ApiPropertyOptional({ example: 'https://ejemplo.com/remision.pdf' })
  @IsUrl()
  @IsOptional()
  comprobante_url?: string;
}
