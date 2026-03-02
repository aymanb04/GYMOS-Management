import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { SupabaseModule } from '../supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [SupabaseModule, AuthModule],
    controllers: [MembersController],
    providers: [MembersService],
})
export class MembersModule {}