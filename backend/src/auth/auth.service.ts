import {
    Injectable,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase.service';

@Injectable()
export class AuthService {
    constructor(private readonly supabase: SupabaseService) {}

    async signUp(
        email: string,
        password: string,
        name: string,
        gymId: string,
        phone?: string,
    ) {
        const serviceClient = this.supabase.getServiceClient();

        const { data: gym, error: gymError } = await serviceClient
            .from('gyms')
            .select('id')
            .eq('id', gymId)
            .single();

        if (gymError || !gym) {
            throw new BadRequestException('Gym not found');
        }

        const { data: authData, error: authError } =
            await serviceClient.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
            });

        if (authError || !authData.user) {
            throw new BadRequestException(authError?.message ?? 'Signup failed');
        }

        const authUser = authData.user;

        const { error: dbError } = await serviceClient.from('users').insert({
            id: authUser.id,
            email: authUser.email,
            name,
            gym_id: gymId,
            role: 'member',
            active: true,
            phone: phone ?? null,
        });

        if (dbError) {
            await serviceClient.auth.admin.deleteUser(authUser.id);
            throw new BadRequestException(dbError.message);
        }

        return { message: 'Account created successfully', userId: authUser.id };
    }

    async signIn(email: string, password: string, gymId?: string) {
        const anonClient = this.supabase.getAnonClient();

        const { data, error } = await anonClient.auth.signInWithPassword({
            email,
            password,
        });

        if (error || !data.session) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const { data: profile, error: profileError } = await this.supabase.getServiceClient()
            .from('users')
            .select('id, email, name, phone, gym_id, role, active, membership_plan_id')
            .eq('id', data.user.id)
            .single();

        if (profileError || !profile) {
            throw new UnauthorizedException('User profile not found');
        }

        // Verify user belongs to the gym of this subdomain
        if (gymId && profile.gym_id !== gymId) {
            throw new UnauthorizedException('Account not found for this gym.');
        }

        // Block inactive members
        if (!profile.active) {
            throw new UnauthorizedException('Your account has been deactivated. Contact your gym.');
        }

        return {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at,
            user: profile,
        };
    }

    async getCurrentUser(jwt: string) {
        const userClient = this.supabase.getUserClient(jwt);
        const { data: authData, error: authError } = await userClient.auth.getUser();

        if (authError || !authData.user) {
            throw new UnauthorizedException('Invalid token');
        }

        const { data: profile, error: profileError } = await this.supabase.getServiceClient()
            .from('users')
            .select('id, email, name, phone, gym_id, role, active, membership_plan_id')
            .eq('id', authData.user.id)
            .single();

        if (profileError || !profile) {
            throw new UnauthorizedException('User profile not found');
        }

        return profile;
    }

    // Add this method to AuthService
    async resetPassword(email: string) {
        const serviceClient = this.supabase.getServiceClient();

        const { error } = await serviceClient.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
        });

        // Always return success even if email doesn't exist (security best practice)
        if (error) console.error('Reset password error:', error.message);
        return { message: 'If an account exists, a reset link has been sent.' };
    }
}