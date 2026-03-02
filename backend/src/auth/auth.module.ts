import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SupabaseModule } from '../supabase.module';
import { SupabaseService } from '../supabase.service';
import { JwtGuard } from './guards/jwt.guard';

@Module({
    imports: [SupabaseModule],
    providers: [AuthService, SupabaseService, JwtGuard],
    controllers: [AuthController],
    exports: [JwtGuard],
})
export class AuthModule {}