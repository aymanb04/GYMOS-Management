import { Injectable, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';

@Injectable()
export class PaymentsService {
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

        if (!profile) throw new ForbiddenException('User not found');
        if (profile.role !== 'admin') throw new ForbiddenException('Admins only');
        return profile.gym_id;
    }

    async getRevenue(jwt: string) {
        const gymId = await this.getAdminGymId(jwt);
        const service = this.supabase.getServiceClient();

        // All paid payments for this gym
        const { data: payments } = await service
            .from('payments')
            .select(`
        id, amount, created_at, status,
        users(name, email),
        membership_plans(name)
    `)
            .eq('gym_id', gymId)
            .eq('status', 'paid')
            .order('created_at', { ascending: false });

        const all = payments ?? [];

        // KPI calculations
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        const totalRevenue = all.reduce((sum, p) => sum + Number(p.amount), 0);

        const thisMonthPayments = all.filter(p => new Date(p.created_at) >= startOfMonth);
        const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);

        const lastMonthPayments = all.filter(p => {
            const d = new Date(p.created_at);
            return d >= startOfLastMonth && d <= endOfLastMonth;
        });
        const lastMonthRevenue = lastMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);

        // Monthly breakdown for chart (last 6 months)
        const monthlyData: { month: string; revenue: number; count: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const label = d.toLocaleString('nl-BE', { month: 'short', year: '2-digit' });
            const monthPayments = all.filter(p => {
                const pd = new Date(p.created_at);
                return pd >= d && pd <= end;
            });
            monthlyData.push({
                month: label,
                revenue: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
                count: monthPayments.length,
            });
        }

        // Revenue by plan
        const planMap: Record<string, { name: string; revenue: number; count: number }> = {};
        for (const p of all) {
            const planName = (p as any).membership_plans?.name ?? 'Unknown';
            if (!planMap[planName]) planMap[planName] = { name: planName, revenue: 0, count: 0 };
            planMap[planName].revenue += Number(p.amount);
            planMap[planName].count += 1;
        }
        const byPlan = Object.values(planMap).sort((a, b) => b.revenue - a.revenue);

        return {
            kpis: {
                totalRevenue,
                thisMonthRevenue,
                lastMonthRevenue,
                totalPayments: all.length,
                thisMonthPayments: thisMonthPayments.length,
            },
            monthlyData,
            byPlan,
            recentPayments: all.slice(0, 20).map(p => ({
                id: p.id,
                amount: p.amount,
                created_at: p.created_at,
                memberName: (p as any).users?.name ?? '—',
                memberEmail: (p as any).users?.email ?? '—',
                planName: (p as any).membership_plans?.name ?? '—',
            })),
        };
    }
}