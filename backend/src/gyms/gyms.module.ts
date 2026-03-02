import { Module } from '@nestjs/common';
import { GymsService } from './gyms.service';
import { GymsController } from './gyms.controller';
import { SupabaseModule } from '../supabase.module';
import { SupabaseService } from '../supabase.service';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [SupabaseModule, AuthModule],
    providers: [GymsService, SupabaseService],
    controllers: [GymsController],
})
export class GymsModule {}