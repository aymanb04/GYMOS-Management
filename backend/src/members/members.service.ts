import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { CreateMemberDto } from './dto/create-member.dto';

@Injectable()
export class MembersService {
    constructor(private readonly supabase: SupabaseService) {}

    private async getAdminGymId(jwt: string): Promise<string> {
        const client = this.supabase.getUserClient(jwt);
        const { data: authData } = await client.auth.getUser();
        if (!authData.user) throw new ForbiddenException('Invalid token');

        const { data: profile } = await this.supabase.getServiceClient()
            .from('users')
            .select('gym_id, role')
            .eq('id', authData.user.id)
            .single();

        if (!profile) throw new ForbiddenException('User profile not found');
        if (profile.role !== 'admin' && profile.role !== 'coach') {
            throw new ForbiddenException('Insufficient permissions');
        }

        return profile.gym_id;
    }

    async getMyProfile(jwt: string) {
        const client = this.supabase.getUserClient(jwt);
        const { data: authData } = await client.auth.getUser();
        if (!authData.user) throw new UnauthorizedException('Invalid token');

        const { data, error } = await this.supabase.getServiceClient()
            .from('users')
            .select(`
                id, name, email, phone, active,
                membership_expires_at,
                membership_plan:membership_plan_id (
                    name, price, duration_months
                )
            `)
            .eq('id', authData.user.id)
            .single();

        if (error || !data) throw new NotFoundException('Profile not found');
        return data;
    }

    async updateMe(dto: { name?: string; password?: string }, jwt: string) {
        const client = this.supabase.getUserClient(jwt);
        const { data: authData } = await client.auth.getUser();
        if (!authData.user) throw new UnauthorizedException('Invalid token');

        if (dto.name) {
            await this.supabase.getServiceClient()
                .from('users')
                .update({ name: dto.name })
                .eq('id', authData.user.id);
        }

        if (dto.password) {
            const { error } = await this.supabase.getServiceClient()
                .auth.admin.updateUserById(authData.user.id, { password: dto.password });
            if (error) throw new Error(error.message);
        }

        return { message: 'Settings updated successfully', passwordChanged: !!dto.password };
    }

    async findAll(jwt: string) {
        const gymId = await this.getAdminGymId(jwt);
        const client = this.supabase.getServiceClient();

        const { data, error } = await client
            .from('users')
            .select(`
                id, name, email, phone, role, active, created_at,
                membership_expires_at,
                membership_plan:membership_plan_id (
                    id, name, price, duration_months
                )
            `)
            .eq('gym_id', gymId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data;
    }

    async getPlans(jwt: string) {
        const gymId = await this.getAdminGymId(jwt);
        const client = this.supabase.getServiceClient();

        const { data, error } = await client
            .from('membership_plans')
            .select('id, name, price, duration_months, description')
            .eq('gym_id', gymId)
            .order('price', { ascending: true });

        if (error) throw new Error(error.message);
        return data ?? [];
    }

    async create(dto: CreateMemberDto, jwt: string) {
        const gymId = await this.getAdminGymId(jwt);
        const serviceClient = this.supabase.getServiceClient();

        const { data: authData, error: authError } =
            await serviceClient.auth.admin.createUser({
                email: dto.email,
                password: dto.password,
                email_confirm: true,
            });

        if (authError || !authData.user) {
            throw new BadRequestException(authError?.message ?? 'Could not create user');
        }

        let membershipExpiresAt: string | null = null;
        if (dto.membership_plan_id) {
            const { data: plan } = await serviceClient
                .from('membership_plans')
                .select('duration_months')
                .eq('id', dto.membership_plan_id)
                .eq('gym_id', gymId)
                .single();

            if (plan) {
                const expiry = new Date();
                expiry.setMonth(expiry.getMonth() + plan.duration_months);
                membershipExpiresAt = expiry.toISOString();
            }
        }

        const { data: member, error: dbError } = await serviceClient
            .from('users')
            .insert({
                id: authData.user.id,
                email: dto.email,
                name: dto.name,
                phone: dto.phone ?? null,
                gym_id: gymId,
                role: 'member',
                active: true,
                membership_plan_id: dto.membership_plan_id ?? null,
                membership_expires_at: membershipExpiresAt,
            })
            .select()
            .single();

        if (dbError) {
            await serviceClient.auth.admin.deleteUser(authData.user.id);
            throw new BadRequestException(dbError.message);
        }

        const { data: fullMember } = await serviceClient
            .from('users')
            .select(`
                id, name, email, phone, role, active, created_at,
                membership_expires_at,
                membership_plan:membership_plan_id (
                    id, name, price, duration_months
                )
            `)
            .eq('id', member.id)
            .single();

        return fullMember;
    }

    async toggleStatus(memberId: string, jwt: string) {
        const gymId = await this.getAdminGymId(jwt);
        const client = this.supabase.getServiceClient();

        const { data: member } = await client
            .from('users')
            .select('id, active, gym_id')
            .eq('id', memberId)
            .eq('gym_id', gymId)
            .single();

        if (!member) throw new NotFoundException('Member not found');

        const { data, error } = await client
            .from('users')
            .update({ active: !member.active })
            .eq('id', memberId)
            .eq('gym_id', gymId)
            .select('id, name, active')
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async assignPlan(memberId: string, planId: string | null, jwt: string) {
        const gymId = await this.getAdminGymId(jwt);
        const client = this.supabase.getServiceClient();

        const { data: member } = await client
            .from('users')
            .select('id, gym_id')
            .eq('id', memberId)
            .eq('gym_id', gymId)
            .single();

        if (!member) throw new NotFoundException('Member not found');

        let membershipExpiresAt: string | null = null;
        if (planId) {
            const { data: plan } = await client
                .from('membership_plans')
                .select('duration_months')
                .eq('id', planId)
                .eq('gym_id', gymId)
                .single();

            if (!plan) throw new NotFoundException('Plan not found');

            const expiry = new Date();
            expiry.setMonth(expiry.getMonth() + plan.duration_months);
            membershipExpiresAt = expiry.toISOString();
        }

        const { data, error } = await client
            .from('users')
            .update({
                membership_plan_id: planId,
                membership_expires_at: membershipExpiresAt,
            })
            .eq('id', memberId)
            .eq('gym_id', gymId)
            .select('id, name, membership_plan_id, membership_expires_at')
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    // Record a cash payment and activate membership
    // In members.service.ts — replace only the recordCashPayment method with this:

    async recordCashPayment(memberId: string, planId: string, jwt: string) {
        const gymId = await this.getAdminGymId(jwt);
        const client = this.supabase.getServiceClient();

        const { data: member } = await client
            .from('users')
            .select('id, gym_id, membership_expires_at')
            .eq('id', memberId)
            .eq('gym_id', gymId)
            .single();

        if (!member) throw new NotFoundException('Member not found');

        const { data: plan } = await client
            .from('membership_plans')
            .select('id, name, price, duration_months')
            .eq('id', planId)
            .eq('gym_id', gymId)
            .single();

        if (!plan) throw new NotFoundException('Plan not found');

        // Period starts after current membership ends (or now) — same logic as Stripe
        const periodStart = member.membership_expires_at && new Date(member.membership_expires_at) > new Date()
            ? new Date(member.membership_expires_at)
            : new Date();

        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + plan.duration_months);

        // Update member's membership to period_end
        await client
            .from('users')
            .update({
                membership_plan_id: planId,
                membership_expires_at: periodEnd.toISOString(),
                active: true,
            })
            .eq('id', memberId)
            .eq('gym_id', gymId);

        // Record cash payment with period
        const { error: paymentError } = await client
            .from('payments')
            .insert({
                gym_id: gymId,
                user_id: memberId,
                amount: plan.price,
                status: 'paid',
                source: 'cash',
                membership_plan_id: planId,
                period_start: periodStart.toISOString(),
                period_end: periodEnd.toISOString(),
            });

        if (paymentError) throw new Error(paymentError.message);

        return {
            message: 'Cash payment recorded and membership activated',
            expires_at: periodEnd.toISOString(),
            plan_name: plan.name,
            amount: plan.price,
        };
    }
}