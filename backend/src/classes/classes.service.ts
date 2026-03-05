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

    // GET /api/classes — all upcoming classes for the user's gym
    async findAll(jwt: string) {
        const { gymId } = await this.getGymAndRole(jwt);

        const { data, error } = await this.supabase.getServiceClient()
            .from('lessons')
            .select('id, title, schedule, capacity, description, duration_minutes, instructor, created_at')
            .eq('gym_id', gymId)
            .gte('schedule', new Date().toISOString())
            .order('schedule', { ascending: true });

        if (error) throw new Error(error.message);
        return data ?? [];
    }

    // GET /api/classes/all — all classes including past (admin only)
    async findAllAdmin(jwt: string) {
        const { gymId, role } = await this.getGymAndRole(jwt);
        if (role !== 'admin' && role !== 'coach') throw new ForbiddenException('Admins only');

        const { data, error } = await this.supabase.getServiceClient()
            .from('lessons')
            .select('id, title, schedule, capacity, description, duration_minutes, instructor, created_at')
            .eq('gym_id', gymId)
            .order('schedule', { ascending: true });

        if (error) throw new Error(error.message);
        return data ?? [];
    }

    // POST /api/classes — create a class (admin/coach only)
    async create(dto: CreateClassDto, jwt: string) {
        const { gymId, role } = await this.getGymAndRole(jwt);
        if (role !== 'admin' && role !== 'coach') throw new ForbiddenException('Admins only');

        const { data, error } = await this.supabase.getServiceClient()
            .from('lessons')
            .insert({
                gym_id: gymId,
                title: dto.title,
                capacity: dto.capacity,
                schedule: dto.schedule,
                description: dto.description ?? null,
                duration_minutes: dto.duration_minutes ?? null,
                instructor: dto.instructor ?? null,
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    // PATCH /api/classes/:id — update a class (admin/coach only)
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
                title: dto.title,
                capacity: dto.capacity,
                schedule: dto.schedule,
                description: dto.description ?? null,
                duration_minutes: dto.duration_minutes ?? null,
                instructor: dto.instructor ?? null,
            })
            .eq('id', classId)
            .eq('gym_id', gymId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    // DELETE /api/classes/:id — delete a class (admin/coach only)
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