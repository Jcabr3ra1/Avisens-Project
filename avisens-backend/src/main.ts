import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import helmet from 'helmet';

declare global {
  interface BigInt {
    toJSON(): string;
  }
}
BigInt.prototype.toJSON = function (this: bigint): string {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  const enProduccion = config.get<string>('NODE_ENV') === 'production';
  app.use(
    helmet({
      contentSecurityPolicy: enProduccion
        ? undefined
        : {
            directives: {
              defaultSrc: [`'self'`],
              scriptSrc: [`'self'`, `'unsafe-inline'`],
              styleSrc: [`'self'`, `'unsafe-inline'`],
              imgSrc: [`'self'`, 'data:'],
              connectSrc: [`'self'`],
            },
          },
    }),
  );

  app.set('trust proxy', 1);

  // Versionado por URI: todas las rutas quedan bajo /v1 por defecto. Los
  // controllers marcados como VERSION_NEUTRAL (health, ingest) quedan sin /v1.
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // CORS_ORIGIN admite varios dominios separados por coma (ej. la web y el panel).
  // Sin valor (solo dev) se permite cualquier origen; en produccion es obligatorio
  // (lo valida env.validation).
  const corsOrigin = config.get<string>('CORS_ORIGIN');
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : true,
    credentials: true,
  });

  app.useGlobalFilters(new HttpExceptionFilter(), new PrismaExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger solo se expone fuera de produccion: en prod no publicamos el esquema
  // completo de la API (no dar pistas del backend a atacantes).
  if (config.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Avisens API')
      .setDescription('API REST del sistema AVISENS')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      'docs',
      app,
      SwaggerModule.createDocument(app, swaggerConfig),
    );
  }

  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Servidor corriendo en http://localhost:${port}`);
  logger.log(`Swagger en http://localhost:${port}/docs`);
}
void bootstrap();
