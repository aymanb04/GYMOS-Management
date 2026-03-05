import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { GymsModule } from './gyms/gyms.module';
import { MembersModule } from './members/members.module';
import { PlansModule } from './plans/plans.module';
import { ClassesModule } from './classes/classes.module';
import { SupabaseModule } from './supabase.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        SupabaseModule,
        AuthModule,
        GymsModule,
        MembersModule,
        PlansModule,
        ClassesModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}