import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';

@Injectable()
export class GymsService {
    constructor(private readonly supabase: SupabaseService) {}

    async findAll() {
        const client = this.supabase.getServiceClient();
        const { data, error } = await client
            .from('gyms')
            .select('id, name, email, created_at')
            .order('name', { ascending: true });

        if (error) throw new Error(error.message);
        return data;
    }

    // Public — resolves subdomain to gym config for white-labeling
    async resolveBySubdomain(subdomain: string) {
        const client = this.supabase.getServiceClient();
        const { data, error } = await client
            .from('gyms')
            .select('id, name, subdomain, brand_color')
            .eq('subdomain', subdomain)
            .single();

        if (error || !data) {
            throw new NotFoundException(`No gym found for subdomain: ${subdomain}`);
        }

        return data;
    }

    async getStats(gymId: string, jwt: string) {
        const client = this.supabase.getUserClient(jwt);

        const { data: gym, error: gymError } = await client
            .from('gyms')
            .select('id, name')
            .eq('id', gymId)
            .single();

        if (gymError || !gym) throw new NotFoundException('Gym not found');

        const { count: memberCount } = await client
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('gym_id', gymId)
            .eq('active', true);

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: payments } = await client
            .from('payments')
            .select('amount')
            .eq('gym_id', gymId)
            .eq('status', 'paid')
            .gte('created_at', startOfMonth.toISOString());

        const monthlyRevenue = (payments ?? []).reduce(
            (sum, p) => sum + Number(p.amount),
            0,
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count: checkinsToday } = await client
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('gym_id', gymId)
            .eq('status', 'attended')
            .gte('created_at', today.toISOString());

        return {
            gymName: gym.name,
            memberCount: memberCount ?? 0,
            monthlyRevenue,
            checkinsToday: checkinsToday ?? 0,
        };
    }

    async getMembers(gymId: string, jwt: string) {
        const client = this.supabase.getUserClient(jwt);
        const { data, error } = await client
            .from('users')
            .select('id, name, email, role, active, created_at, membership_plan_id')
            .eq('gym_id', gymId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw new Error(error.message);
        return data;
    }
}