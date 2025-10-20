import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException, ValidationError } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'https://www.pollycasso.com',
    credentials: true,
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
          reason: Object.values(err.constraints!),
        }));

        return new BadRequestException({
          code: 400,
          message: '입력값에 오류가 있습니다.',
          errors: formattedErrors,
        });
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => {
  console.error('서버 시작 중 오류 발생:', err);
  process.exit(1);
});
