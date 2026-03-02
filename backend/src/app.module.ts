import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { GymsModule } from './gyms/gyms.module';
import { MembersModule } from './members/members.module';
import { SupabaseModule } from './supabase.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        SupabaseModule,
        AuthModule,
        GymsModule,
        MembersModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}