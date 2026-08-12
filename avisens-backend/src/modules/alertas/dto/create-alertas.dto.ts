import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNumber, IsString, isString } from "class-validator";

export class CreateAlertasDto {
 @ApiProperty({
    example: 1,
    description: 'ID de la alerta al que pertenece',
  })
  @IsInt()
  alerta__id: Number;



@ApiProperty({
    example: '1'    ,
    description: 'ID deL galpon a la que pertenece',

    })
@IsInt()
galpon__id: Number;

@ApiProperty({
    example: '1 ',
    description: 'ID del lote al que pertenece',
    })
@IsInt()
lote__id: Number;

@ApiProperty({
    example: '1',
    description: 'ID del sensor al que pertenece',
    })
@IsInt()
sensor__id: Number;

@ApiPropertyOptional ({
    example: '1',
    description: 'ID del tipo de alerta ala que pertenece',
    })

@IsString()
tipo_alerta__id: String;


@ApiPropertyOptional ({

    example: 'critica',
    description: 'nivel de criticidad : baja media o critica', 

})

@IsString()

criticidad: String;


@ApiPropertyOptional ({
    example: '34.5',
    description: 'valor medido que disparo la alerta',
})
@IsNumber()
valor_detectado: Number;


@ApiProperty({
    example: '30.0' ,
    description: 'valor umbral configurado que fue superado',

})
@IsNumber()
valor_umbral: Number;


@ApiProperty({
    example: 'mensaje descriptivo de la alerta',
    description: 'mensaje descriptivo de la alerta',
})
@IsString()
mensaje: String;


@ApiProperty({
    example: 'abierta',
    description: 'estado de la alerta: abierta o cerrada',
})
@IsString()
estado: String;

@ApiProperty({
    example: '2'   ,
    description: 'ID responsable de atender la alerta ',
})  

@IsInt()
responsable__id: Number;


@ApiPropertyOptional({
    example: '1',
    description: 'ID del usuario aquien escalo la alerta'
})
@IsInt()
escalo_a_id: Number;

@ApiPropertyOptional({
    example: 'se activo ventilacion de emergencia ',
    description: 'accion tomada para atender la alerta',
})
@IsString()
accion_correctiva: String;


@ApiProperty    ({
    example: '2024-06-15 14:35:00',
    description: 'fecha y hora en que se acepto la alerta',
})
@IsString()
fecha_aceptacion: String;

@ApiProperty    ({
    example: '2024-06-15 14:40:00',
    description: 'fecha y hora en que se cerro la alerta',
})
@IsString()
fecha_cierre: String;


}
