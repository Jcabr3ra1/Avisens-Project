import { PartialType } from '@nestjs/swagger';
import { CreatePesajeDto } from './create-pesaje.dto';

export class UpdatePesajeDto extends PartialType(CreatePesajeDto) {}
