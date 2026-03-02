import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseService {
    constructor(private readonly configService: ConfigService) {}

    /*
    =====================================
    SERVICE ROLE CLIENT (Admin Only)
    =====================================
    Gebruik enkel voor:
    - Signup
    - Webhooks
    - Admin taken
    - Cron jobs
    */
    getServiceClient(): SupabaseClient {
        return createClient(
            this.configService.get<string>('SUPABASE_URL')!,
            this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!
        );
    }

    /*
    =====================================
    ANON CLIENT (Public Auth)
    =====================================
    Gebruik voor:
    - Login
    - Password reset
    - Email confirmation
    */
    getAnonClient(): SupabaseClient {
        return createClient(
            this.configService.get<string>('SUPABASE_URL')!,
            this.configService.get<string>('SUPABASE_ANON_KEY')!
        );
    }

    /*
    =====================================
    USER CLIENT (JWT Scoped)
    =====================================
    Gebruik voor:
    - Alle user data queries
    - Gym-specifieke queries
    - Alles waar RLS actief moet zijn
    */
    getUserClient(jwt: string): SupabaseClient {
        return createClient(
            this.configService.get<string>('SUPABASE_URL')!,
            this.configService.get<string>('SUPABASE_ANON_KEY')!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${jwt}`,
                    },
                },
            }
        );
    }
}