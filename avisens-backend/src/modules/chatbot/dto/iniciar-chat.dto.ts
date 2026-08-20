import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class IniciarChatDto {
  @ApiPropertyOptional({
    example: 'web',
    description: 'Canal por el que llega el prospecto',
  })
  @IsString()
  @IsIn(['web', 'whatsapp'])
  @IsOptional()
  canal_origen?: string;
}
