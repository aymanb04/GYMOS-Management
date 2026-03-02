import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.enableCors({
        origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
        credentials: true,
    });

    // All routes prefixed with /api — e.g. POST /api/auth/login
    app.setGlobalPrefix('api');

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
        }),
    );

    await app.listen(process.env.PORT ?? 3000);
    console.log(`Backend running on port ${process.env.PORT ?? 3000}`);
}
bootstrap();