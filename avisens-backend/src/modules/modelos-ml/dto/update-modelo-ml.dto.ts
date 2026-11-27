import { PartialType } from '@nestjs/swagger';
import { CreateModeloMlDto } from './create-modelo-ml.dto';

export class UpdateModeloMlDto extends PartialType(CreateModeloMlDto) {}
