import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { ActiveMembershipDto } from './dto/active-membership.dto';

@Injectable()
export class MembershipsService {
    constructor(private supabaseService: SupabaseService) {}

    async getActiveMemberships() {
        const supabase = this.supabaseService.getServiceClient();
        const today = new Date().toISOString();

        const { data, error } = await supabase
            .from('users')
            .select(`
        id,
        name,
        email,
        role,
        membership_expires_at,
        membership_plan:membership_plan_id (
          name,
          price,
          duration_months
        )
      `)
            .eq('active', true)
            .gt('membership_expires_at', today);

        if (error) {
            console.error(error);
            throw new Error(error.message);
        }

        return data.map((user) => this.mapToActiveMembershipDto(user));
    }

    private mapToActiveMembershipDto(user: any): ActiveMembershipDto {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            membership_expires_at: user.membership_expires_at,
            membership_plan: {
                name: user.membership_plan?.[0]?.name,
                price: user.membership_plan?.[0]?.price,
                duration_months: user.membership_plan?.[0]?.duration_months,
            },
        };
    }
}