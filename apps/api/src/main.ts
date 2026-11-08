import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { APP_CONFIG, type AppConfig } from './config/app-config';

async function bootstrap(): Promise<void> {
  try {
    process.loadEnvFile();
  } catch {
    // .env is optional
  }
  const app = configureApp(await NestFactory.create<NestExpressApplication>(AppModule));
  const config = app.get<AppConfig>(APP_CONFIG);
  await app.listen(config.port, '0.0.0.0');
  const logger = new Logger('Bootstrap');
  logger.log(`API http://localhost:${config.port}  docs /docs  live ws /live`);
  logger.log(
    `Routing: ${config.routingProvider}  geocoding: ${config.geocodingProvider}  simulator: ${config.simulateDriver}`,
  );
}

void bootstrap();
