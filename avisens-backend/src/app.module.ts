import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { GranjasModule } from './modules/granjas/granjas.module';
import { GalponesModule } from './modules/galpones/galpones.module';
import { HealthModule } from './modules/health/health.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { DispositivosModule } from './modules/dispositivos/dispositivos.module';
import { SensoresModule } from './modules/sensores/sensores.module';
import { MedicionesModule } from './modules/mediciones/mediciones.module';
import { UmbralesModule } from './modules/umbrales/umbrales.module';
import { ProveedoresModule } from './modules/proveedores/proveedores.module';
import { InsumosModule } from './modules/insumos/insumos.module';
import { IngestModule } from './modules/ingest/ingest.module';
import { LotesModule } from './modules/lotes/lotes.module';
import { PesajesModule } from './modules/pesajes/pesajes.module';
import { RegistrosMortalidadModule } from './modules/registros-mortalidad/registros-mortalidad.module';
import { EventosSanitariosModule } from './modules/eventos-sanitarios/eventos-sanitarios.module';
import { ConsumosDiariosModule } from './modules/consumos-diarios/consumos-diarios.module';
import { RegistrosPlagasModule } from './modules/registros-plagas/registros-plagas.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    GranjasModule,
    GalponesModule,
    DispositivosModule,
    SensoresModule,
    ProveedoresModule,
    InsumosModule,
    MedicionesModule,
    UmbralesModule,
    IngestModule,
    LotesModule,
    PesajesModule,
    RegistrosMortalidadModule,
    EventosSanitariosModule,
    ConsumosDiariosModule,
    RegistrosPlagasModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
