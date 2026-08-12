import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString } from "class-validator";

export class CreatePoliticasAlertaDto{
    @ApiProperty({example: 1, description: 'Id de la politica de alerta'})
    @IsInt()
    politica_alerta_id: number;

    @ApiProperty({example: 1, description: 'Id de la granja'})
    @IsInt()
    granja_id: number;

    @ApiProperty({example: 'Alta', description: 'Nivel de criticidad: Baja, Media, Alta'})
    @IsString()
    criticidad: string;

    @ApiProperty({example: 2, description: 'Nivel de escalamiento asignado'})
    @IsInt()
    nivel_escalamiento: number;

    @ApiProperty({example: 'WhatsApp', description: 'Canal de notificacion asignado: WhatsApp, Email, SMS'})
    @IsString()
    canal: string;

    @ApiProperty({example: 900, description: 'Tiempo de espera en segundos para el siguiente escalamiento'})
    @IsInt()
    tiempo_max_respuesta_seg: number;

    @ApiProperty({example: false, description: 'Indica si la politica de alerta esta activa o no'})
    @IsBoolean()
    @IsOptional()
    verificado: boolean;

    @ApiProperty({example: false, description: 'Indica si la politica de alerta ha sido activada o no'})
    @IsBoolean()
    @IsOptional()
    activa: boolean;

}