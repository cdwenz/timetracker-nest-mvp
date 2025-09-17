import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = app.get(ConfigService);
  const port = parseInt(config.get<string>('PORT') ?? '8000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API ready on http://localhost:${port}/api`);
}
bootstrap();
