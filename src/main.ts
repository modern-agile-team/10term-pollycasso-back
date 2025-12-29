import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException, ValidationError } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: 'GET,POST,PUT,PATCH,DELETE',
    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const formattedErrors = errors.map((err) => ({
          field: err.property,
          reason: err.constraints ? Object.values(err.constraints) : [],
        }));

        return new BadRequestException({
          status: 400,
          code: 'INVALID_INPUT',
          errors: formattedErrors,
        });
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('폴리카소(pollycasso)')
    .setDescription('폴리카소(pollycasso) API 명세서')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      operationsSorter: (
        a: { get: (key: string) => string | undefined },
        b: { get: (key: string) => string | undefined },
      ) => {
        const order: Record<string, string> = {
          get: '0',
          post: '1',
          put: '2',
          patch: '3',
          delete: '4',
        };
        const methodA = a.get('method')?.toLowerCase() ?? '5';
        const methodB = b.get('method')?.toLowerCase() ?? '5';
        return (order[methodA] ?? '5').localeCompare(order[methodB] ?? '5');
      },
    },
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port);
}

bootstrap().catch((err) => {
  console.error('서버 시작 중 오류 발생:', err);
});
