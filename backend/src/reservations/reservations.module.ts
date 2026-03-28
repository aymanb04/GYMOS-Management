import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { SupabaseModule } from '../supabase.module';
import { MailModule } from '../mail/mail.module';

@Module({
    imports: [SupabaseModule, MailModule],
    controllers: [ReservationsController],
    providers: [ReservationsService],
})
export class ReservationsModule {}