import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        rawBody: true, // Required for Stripe webhook signature verification
    });

    app.setGlobalPrefix('api');

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: false,
            transform: true,
        }),
    );

    app.enableCors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (
                origin.endsWith('.gymos.io') ||
                origin.endsWith('.gymos.be') ||
                origin === 'https://gymos.io' ||
                origin === 'https://www.gymos.io' ||
                origin === process.env.FRONTEND_URL ||
                origin.includes('localhost')
            ) {
                return callback(null, true);
            }
            callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
    });

    const port = process.env.PORT ?? 3001;
    await app.listen(port);
    console.log(`Backend running on port ${port}`);
}

bootstrap();