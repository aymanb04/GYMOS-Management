import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { CreatePlanDto } from './dto/create-plan.dto';

@Injectable()
export class PlansService {
    constructor(private readonly supabase: SupabaseService) {}

    // Any authenticated user — returns gym_id and role
    private async getGymId(jwt: string): Promise<string> {
        const client = this.supabase.getUserClient(jwt);
        const { data: authData } = await client.auth.getUser();
        if (!authData.user) throw new ForbiddenException('Invalid token');

        const { data: profile } = await this.supabase.getServiceClient()
            .from('users')
            .select('gym_id')
            .eq('id', authData.user.id)
            .single();

        if (!profile) throw new ForbiddenException('User profile not found');
        return profile.gym_id;
    }

    // Admin only
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
        if (profile.role !== 'admin') throw new ForbiddenException('Admins only');

        return profile.gym_id;
    }

    // Available to all roles — members need this to choose and pay for a plan
    async findAll(jwt: string) {
        const gymId = await this.getGymId(jwt);
        const { data, error } = await this.supabase.getServiceClient()
            .from('membership_plans')
            .select('id, name, price, duration_months, description, created_at')
            .eq('gym_id', gymId)
            .order('price', { ascending: true });

        if (error) throw new Error(error.message);
        return data ?? [];
    }

    async create(dto: CreatePlanDto, jwt: string) {
        const gymId = await this.getAdminGymId(jwt);
        const { data, error } = await this.supabase.getServiceClient()
            .from('membership_plans')
            .insert({
                gym_id: gymId,
                name: dto.name,
                price: dto.price,
                duration_months: dto.duration_months,
                description: dto.description ?? null,
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async update(planId: string, dto: Partial<CreatePlanDto>, jwt: string) {
        const gymId = await this.getAdminGymId(jwt);

        const { data: existing } = await this.supabase.getServiceClient()
            .from('membership_plans')
            .select('id')
            .eq('id', planId)
            .eq('gym_id', gymId)
            .single();

        if (!existing) throw new NotFoundException('Plan not found');

        const { data, error } = await this.supabase.getServiceClient()
            .from('membership_plans')
            .update({
                name: dto.name,
                price: dto.price,
                duration_months: dto.duration_months,
                description: dto.description ?? null,
            })
            .eq('id', planId)
            .eq('gym_id', gymId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async remove(planId: string, jwt: string) {
        const gymId = await this.getAdminGymId(jwt);

        const { count } = await this.supabase.getServiceClient()
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('membership_plan_id', planId);

        if (count && count > 0) {
            throw new BadRequestException(
                `Cannot delete — ${count} member${count !== 1 ? 's are' : ' is'} on this plan. Reassign them first.`
            );
        }

        const { error } = await this.supabase.getServiceClient()
            .from('membership_plans')
            .delete()
            .eq('id', planId)
            .eq('gym_id', gymId);

        if (error) throw new Error(error.message);
        return { message: 'Plan deleted' };
    }
}