import {
    Injectable,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { CreateClassDto } from './dto/create-class.dto';

@Injectable()
export class ClassesService {
    constructor(private readonly supabase: SupabaseService) {}

    private async getGymAndRole(jwt: string): Promise<{ gymId: string; role: string }> {
        const client = this.supabase.getUserClient(jwt);
        const { data: authData } = await client.auth.getUser();
        if (!authData.user) throw new ForbiddenException('Invalid token');

        const { data: profile } = await this.supabase.getServiceClient()
            .from('users')
            .select('gym_id, role')
            .eq('id', authData.user.id)
            .single();

        if (!profile) throw new ForbiddenException('User profile not found');
        return { gymId: profile.gym_id, role: profile.role };
    }

    // GET /api/classes — weekly schedule for any authenticated user
    async findAll(jwt: string) {
        const { gymId } = await this.getGymAndRole(jwt);

        const { data, error } = await this.supabase.getServiceClient()
            .from('lessons')
            .select('id, title, day_of_week, time_of_day, capacity, capacity_enforced, description, duration_minutes, instructor')
            .eq('gym_id', gymId)
            .order('day_of_week', { ascending: true })
            .order('time_of_day', { ascending: true });

        if (error) throw new Error(error.message);
        return data ?? [];
    }

    // POST /api/classes
    async create(dto: CreateClassDto, jwt: string) {
        const { gymId, role } = await this.getGymAndRole(jwt);
        if (role !== 'admin' && role !== 'coach') throw new ForbiddenException('Admins only');

        const { data, error } = await this.supabase.getServiceClient()
            .from('lessons')
            .insert({
                gym_id: gymId,
                title: dto.title,
                day_of_week: dto.day_of_week,
                time_of_day: dto.time_of_day,
                capacity: dto.capacity,
                capacity_enforced: dto.capacity_enforced ?? false,
                description: dto.description ?? null,
                duration_minutes: dto.duration_minutes ?? null,
                instructor: dto.instructor ?? null,
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    // PATCH /api/classes/:id
    async update(classId: string, dto: Partial<CreateClassDto>, jwt: string) {
        const { gymId, role } = await this.getGymAndRole(jwt);
        if (role !== 'admin' && role !== 'coach') throw new ForbiddenException('Admins only');

        const { data: existing } = await this.supabase.getServiceClient()
            .from('lessons')
            .select('id')
            .eq('id', classId)
            .eq('gym_id', gymId)
            .single();

        if (!existing) throw new NotFoundException('Class not found');

        const { data, error } = await this.supabase.getServiceClient()
            .from('lessons')
            .update({
                ...(dto.title !== undefined && { title: dto.title }),
                ...(dto.day_of_week !== undefined && { day_of_week: dto.day_of_week }),
                ...(dto.time_of_day !== undefined && { time_of_day: dto.time_of_day }),
                ...(dto.capacity !== undefined && { capacity: dto.capacity }),
                ...(dto.capacity_enforced !== undefined && { capacity_enforced: dto.capacity_enforced }),
                ...(dto.description !== undefined && { description: dto.description ?? null }),
                ...(dto.duration_minutes !== undefined && { duration_minutes: dto.duration_minutes ?? null }),
                ...(dto.instructor !== undefined && { instructor: dto.instructor ?? null }),
            })
            .eq('id', classId)
            .eq('gym_id', gymId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    // DELETE /api/classes/:id
    async remove(classId: string, jwt: string) {
        const { gymId, role } = await this.getGymAndRole(jwt);
        if (role !== 'admin' && role !== 'coach') throw new ForbiddenException('Admins only');

        const { data: existing } = await this.supabase.getServiceClient()
            .from('lessons')
            .select('id')
            .eq('id', classId)
            .eq('gym_id', gymId)
            .single();

        if (!existing) throw new NotFoundException('Class not found');

        const { error } = await this.supabase.getServiceClient()
            .from('lessons')
            .delete()
            .eq('id', classId)
            .eq('gym_id', gymId);

        if (error) throw new Error(error.message);
        return { message: 'Class deleted' };
    }
}