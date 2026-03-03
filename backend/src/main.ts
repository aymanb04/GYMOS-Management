import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.enableCors({
        origin: (origin, callback) => {
            // Allow any subdomain of gymos.io and localhost for dev
            if (
                !origin ||
                origin.endsWith('.gymos.io') ||
                origin === 'https://gymos.io' ||
                origin.includes('localhost')
            ) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
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