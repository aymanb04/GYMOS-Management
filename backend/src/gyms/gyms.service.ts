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
}