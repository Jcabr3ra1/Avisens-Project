import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt,IsOptional, IsString } from "class-validator";

export class CreateDispositivoDto {
    @ApiProperty({ example: 1, description: 'ID del galpon donde esta instalado'})
    @IsInt()
    galpon_id: number;
    
    @ApiProperty({ example: 'A4:CF:12:8B:00:1A', description: 'MAC fisica de la ESP32 (unica)'})
    @IsString()
    mac_address: string;

    @ApiProperty({ example: 'galpon1', description: 'Prefijo del topic MQTT (unico)'})
    @IsString()
    codigo_topic: string;

    @ApiProperty({example: 'Nodo entrada norte'})
    @IsString()
    nombre: string;

    @ApiPropertyOptional({example: '1.0.3', description: 'Version del firmware'})
    @IsString()
    @IsOptional()
    version_firmware?: string;

    @ApiPropertyOptional({example: '192.168.1.42', description: 'IP en la red wifi local'})
    @IsString()
    @IsOptional()
    ip_local?: string;
}