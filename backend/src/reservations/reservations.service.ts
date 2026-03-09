import {
    Injectable,
    ForbiddenException,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase.service';

@Injectable()
export class ReservationsService {
    constructor(private readonly supabase: SupabaseService) {}

    private async getUserProfile(jwt: string) {
        const client = this.supabase.getUserClient(jwt);
        const { data: authData } = await client.auth.getUser();
        if (!authData.user) throw new ForbiddenException('Invalid token');

        const { data: profile } = await this.supabase.getServiceClient()
            .from('users')
            .select('id, gym_id, role')
            .eq('id', authData.user.id)
            .single();

        if (!profile) throw new ForbiddenException('Profile not found');
        return profile;
    }

    // Member books a spot in a class for a specific date
    async book(lessonId: string, reservedDate: string, jwt: string) {
        const profile = await this.getUserProfile(jwt);
        const service = this.supabase.getServiceClient();

        // Verify lesson belongs to this gym
        const { data: lesson } = await service
            .from('lessons')
            .select('id, capacity, capacity_enforced, title')
            .eq('id', lessonId)
            .eq('gym_id', profile.gym_id)
            .single();

        if (!lesson) throw new NotFoundException('Class not found');

        // Check for duplicate booking
        const { data: existing } = await service
            .from('reservations')
            .select('id')
            .eq('lesson_id', lessonId)
            .eq('user_id', profile.id)
            .eq('reserved_date', reservedDate)
            .eq('status', 'booked')
            .maybeSingle();

        if (existing) throw new BadRequestException('You already booked this class.');

        // Check capacity if enforced
        if (lesson.capacity_enforced) {
            const { count } = await service
                .from('reservations')
                .select('id', { count: 'exact', head: true })
                .eq('lesson_id', lessonId)
                .eq('reserved_date', reservedDate)
                .eq('status', 'booked');

            if ((count ?? 0) >= lesson.capacity) {
                throw new BadRequestException('This class is full.');
            }
        }

        const { data, error } = await service
            .from('reservations')
            .insert({
                gym_id: profile.gym_id,
                user_id: profile.id,
                lesson_id: lessonId,
                reserved_date: reservedDate,
                status: 'booked',
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    // Member cancels their booking
    async cancel(reservationId: string, jwt: string) {
        const profile = await this.getUserProfile(jwt);
        const service = this.supabase.getServiceClient();

        const { data: reservation } = await service
            .from('reservations')
            .select('id, user_id, gym_id')
            .eq('id', reservationId)
            .single();

        if (!reservation) throw new NotFoundException('Reservation not found');

        // Members can only cancel their own, admins can cancel any in their gym
        if (profile.role === 'member' && reservation.user_id !== profile.id) {
            throw new ForbiddenException('Not your reservation');
        }
        if (reservation.gym_id !== profile.gym_id) {
            throw new ForbiddenException('Not your gym');
        }

        const { error } = await service
            .from('reservations')
            .update({ status: 'cancelled' })
            .eq('id', reservationId);

        if (error) throw new Error(error.message);
        return { message: 'Booking cancelled' };
    }

    // Member gets their upcoming bookings
    async getMyBookings(jwt: string) {
        const profile = await this.getUserProfile(jwt);
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await this.supabase.getServiceClient()
            .from('reservations')
            .select(`
                id, reserved_date, status,
                lesson:lessons(id, title, time_of_day, duration_minutes, instructor, day_of_week)
            `)
            .eq('user_id', profile.id)
            .eq('gym_id', profile.gym_id)
            .eq('status', 'booked')
            .gte('reserved_date', today)
            .order('reserved_date', { ascending: true });

        if (error) throw new Error(error.message);
        return data ?? [];
    }

    // Get booking counts per lesson for a specific date (used by member portal)
    async getBookingCounts(gymId: string, date: string) {
        const { data, error } = await this.supabase.getServiceClient()
            .from('reservations')
            .select('lesson_id')
            .eq('gym_id', gymId)
            .eq('reserved_date', date)
            .eq('status', 'booked');

        if (error) throw new Error(error.message);

        const counts: Record<string, number> = {};
        for (const r of data ?? []) {
            counts[r.lesson_id] = (counts[r.lesson_id] ?? 0) + 1;
        }
        return counts;
    }

    // Get member's bookings for a specific date (to show booked state)
    async getMyBookingsForDate(userId: string, gymId: string, date: string) {
        const { data } = await this.supabase.getServiceClient()
            .from('reservations')
            .select('lesson_id, id')
            .eq('user_id', userId)
            .eq('gym_id', gymId)
            .eq('reserved_date', date)
            .eq('status', 'booked');

        const map: Record<string, string> = {};
        for (const r of data ?? []) {
            map[r.lesson_id] = r.id;
        }
        return map;
    }

    // Admin: get all bookings for a specific lesson + date
    async getLessonBookings(lessonId: string, date: string, jwt: string) {
        const profile = await this.getUserProfile(jwt);
        if (profile.role !== 'admin' && profile.role !== 'coach') {
            throw new ForbiddenException('Admins only');
        }

        const { data, error } = await this.supabase.getServiceClient()
            .from('reservations')
            .select(`
                id, reserved_date, status, created_at,
                user:users(id, name, email)
            `)
            .eq('lesson_id', lessonId)
            .eq('gym_id', profile.gym_id)
            .eq('reserved_date', date)
            .eq('status', 'booked')
            .order('created_at', { ascending: true });

        if (error) throw new Error(error.message);
        return data ?? [];
    }

    // Get booking data for member portal (counts + user's bookings for a date)
    async getClassDataForDate(date: string, jwt: string) {
        const profile = await this.getUserProfile(jwt);

        const [counts, myBookings] = await Promise.all([
            this.getBookingCounts(profile.gym_id, date),
            this.getMyBookingsForDate(profile.id, profile.gym_id, date),
        ]);

        return { counts, myBookings };
    }
}