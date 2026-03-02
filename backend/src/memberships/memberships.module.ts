import { Module } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { MembershipsController } from './memberships.controller';
import { SupabaseModule } from '../supabase.module';

@Module({
    imports: [SupabaseModule],
    controllers: [MembershipsController],
    providers: [MembershipsService],
})
export class MembershipsModule {}
