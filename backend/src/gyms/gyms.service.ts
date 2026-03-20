import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';

interface MulterFile {
    fieldname: string;
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}

@Injectable()
export class GymsService {
    constructor(private readonly supabase: SupabaseService) {}

    async resolveBySubdomain(subdomain: string) {
        const db = this.supabase.getServiceClient();

        const { data, error } = await db
            .from('gyms')
            .select('id, name, subdomain, brand_color, logo_url, features')
            .eq('subdomain', subdomain)
            .single();

        if (error || !data) throw new NotFoundException('Gym not found');
        return data;
    }

    async update(gymId: string, userId: string, dto: { name?: string; brand_color?: string }) {
        const db = this.supabase.getServiceClient();

        const { data: user } = await db
            .from('users')
            .select('role, gym_id')
            .eq('id', userId)
            .single();

        if (!user || user.role !== 'admin' || user.gym_id !== gymId) {
            throw new ForbiddenException('Not allowed');
        }

        const { data, error } = await db
            .from('gyms')
            .update(dto)
            .eq('id', gymId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async uploadLogo(gymId: string, userId: string, file: MulterFile) {
        const db = this.supabase.getServiceClient();

        // Verify admin
        const { data: user } = await db
            .from('users')
            .select('role, gym_id')
            .eq('id', userId)
            .single();

        if (!user || user.role !== 'admin' || user.gym_id !== gymId) {
            throw new ForbiddenException('Not allowed');
        }

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
            throw new ForbiddenException('Only PNG, JPG, SVG and WebP are allowed');
        }

        // Max 2MB
        if (file.size > 2 * 1024 * 1024) {
            throw new ForbiddenException('File must be smaller than 2MB');
        }

        const ext = file.originalname.split('.').pop();
        const path = `${gymId}/logo.${ext}`;

        // Upload to Supabase Storage (upsert = overwrite existing)
        const { error: uploadError } = await db.storage
            .from('gym-logos')
            .upload(path, file.buffer, {
                contentType: file.mimetype,
                upsert: true,
            });

        if (uploadError) throw new Error(uploadError.message);

        // Get public URL
        const { data: urlData } = db.storage
            .from('gym-logos')
            .getPublicUrl(path);

        const logoUrl = urlData.publicUrl;

        // Save URL to gym record
        const { error } = await db
            .from('gyms')
            .update({ logo_url: logoUrl })
            .eq('id', gymId);

        if (error) throw new Error(error.message);

        return { logo_url: logoUrl };
    }

    async removeLogo(gymId: string, userId: string) {
        const db = this.supabase.getServiceClient();

        const { data: user } = await db
            .from('users')
            .select('role, gym_id')
            .eq('id', userId)
            .single();

        if (!user || user.role !== 'admin' || user.gym_id !== gymId) {
            throw new ForbiddenException('Not allowed');
        }

        // Try to delete all common extensions
        await Promise.allSettled([
            db.storage.from('gym-logos').remove([`${gymId}/logo.png`]),
            db.storage.from('gym-logos').remove([`${gymId}/logo.jpg`]),
            db.storage.from('gym-logos').remove([`${gymId}/logo.jpeg`]),
            db.storage.from('gym-logos').remove([`${gymId}/logo.svg`]),
            db.storage.from('gym-logos').remove([`${gymId}/logo.webp`]),
        ]);

        await db
            .from('gyms')
            .update({ logo_url: null })
            .eq('id', gymId);

        return { logo_url: null };
    }

    // Voeg deze twee methodes toe aan je gyms.service.ts
// Zelfde patroon als de bestaande update() en uploadLogo() methodes

// ── POPULAR CLASSES ──
// Top lessen gerankt op aantal boekingen (laatste 30 dagen)
    async getPopularClasses(gymId: string, userId: string) {
        const db = this.supabase.getServiceClient();

        const { data: user } = await db
            .from('users')
            .select('role, gym_id')
            .eq('id', userId)
            .single();

        if (!user || user.role !== 'admin' || user.gym_id !== gymId) {
            throw new ForbiddenException('Not allowed');
        }

        const since = new Date();
        since.setDate(since.getDate() - 30);

        const { data: reservations } = await db
            .from('reservations')
            .select(`
            lesson_id,
            lesson:lessons(title, day_of_week, time_of_day, instructor)
        `)
            .eq('gym_id', gymId)
            .eq('status', 'booked')
            .gte('created_at', since.toISOString());

        if (!reservations) return [];

        const map: Record<string, {
            title: string;
            day_of_week: number;
            time_of_day: string;
            instructor: string | null;
            count: number;
        }> = {};

        for (const r of reservations) {
            const lesson = r.lesson as any;
            if (!r.lesson_id || !lesson) continue;
            if (!map[r.lesson_id]) {
                map[r.lesson_id] = {
                    title: lesson.title,
                    day_of_week: lesson.day_of_week,
                    time_of_day: lesson.time_of_day,
                    instructor: lesson.instructor ?? null,
                    count: 0,
                };
            }
            map[r.lesson_id].count += 1;
        }

        return Object.entries(map)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }

// ── MEMBER ACTIVITY ──
// Leden gerankt op aantal boekingen (laatste 30 dagen)
// heavy = top 25%, light = bottom 25%, regular = midden
    async getMemberActivity(gymId: string, userId: string) {
        const db = this.supabase.getServiceClient();

        const { data: user } = await db
            .from('users')
            .select('role, gym_id')
            .eq('id', userId)
            .single();

        if (!user || user.role !== 'admin' || user.gym_id !== gymId) {
            throw new ForbiddenException('Not allowed');
        }

        const since = new Date();
        since.setDate(since.getDate() - 30);

        const { data: reservations } = await db
            .from('reservations')
            .select(`
            user_id,
            user:users(name, email)
        `)
            .eq('gym_id', gymId)
            .eq('status', 'booked')
            .gte('created_at', since.toISOString());

        if (!reservations) return [];

        const map: Record<string, { name: string; email: string; count: number }> = {};

        for (const r of reservations) {
            const u = r.user as any;
            if (!r.user_id || !u) continue;
            if (!map[r.user_id]) {
                map[r.user_id] = { name: u.name, email: u.email, count: 0 };
            }
            map[r.user_id].count += 1;
        }

        const sorted = Object.entries(map)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.count - a.count);

        const total = sorted.length;

        return sorted.map((member, i) => ({
            ...member,
            label: i < Math.ceil(total * 0.25) ? 'heavy'
                : i >= Math.floor(total * 0.75) ? 'light'
                    : 'regular',
        }));
    }
}