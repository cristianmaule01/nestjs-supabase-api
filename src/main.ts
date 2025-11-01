import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global error handling
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  // Security headers
  app.use(helmet());

  // Configure CORS
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://angularsite-production.up.railway.app'] 
      : '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  const host = '0.0.0.0';

  await app.listen(port, host, () => {
    console.log(`🚀 NestJS Application is running on: ${host}:${port}`);
    console.log(`📊 Health check available at: http://${host}:${port}/health`);
  });
}
bootstrap();
