import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { GymsController } from './gyms.controller';
import { GymsService } from './gyms.service';
import { SupabaseModule } from '../supabase.module';

@Module({
    imports: [
        SupabaseModule,
        // Store file in memory buffer so we can pass it to Supabase Storage
        MulterModule.register({ storage: memoryStorage() }),
    ],
    controllers: [GymsController],
    providers: [GymsService],
    exports: [GymsService],
})
export class GymsModule {}