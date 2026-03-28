import {
    Injectable,
    ForbiddenException,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { MailService } from '../mail/mail.service';

const WAITLIST_MAX = 20;

@Injectable()
export class ReservationsService {
    constructor(
        private readonly supabase: SupabaseService,
        private readonly mail: MailService,
    ) {}

    private async getUserProfile(jwt: string) {
        const client = this.supabase.getUserClient(jwt);
        const { data: authData } = await client.auth.getUser();
        if (!authData.user) throw new ForbiddenException('Invalid token');

        const { data: profile } = await this.supabase.getServiceClient()
            .from('users')
            .select('id, gym_id, role, name, email')
            .eq('id', authData.user.id)
            .single();

        if (!profile) throw new ForbiddenException('Profile not found');
        return profile;
    }

    // Timezone-safe local date string (YYYY-MM-DD) — Brussels timezone
    private getLocalToday(): string {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date());
    }

    // ── BOOK ──────────────────────────────────────────────────────────────────
    async book(lessonId: string, reservedDate: string, jwt: string) {
        const profile = await this.getUserProfile(jwt);
        const service = this.supabase.getServiceClient();

        // Verify lesson belongs to this gym
        const { data: lesson } = await service
            .from('lessons')
            .select('id, capacity, capacity_enforced, title, time_of_day, gym_id')
            .eq('id', lessonId)
            .eq('gym_id', profile.gym_id)
            .single();

        if (!lesson) throw new NotFoundException('Class not found');

        // Check date not in past
        const today = this.getLocalToday();
        if (reservedDate < today) {
            throw new BadRequestException('Cannot book a class in the past.');
        }

        // Check already on waitlist
        const { data: onWaitlist } = await service
            .from('waitlist')
            .select('id')
            .eq('lesson_id', lessonId)
            .eq('user_id', profile.id)
            .eq('reserved_date', reservedDate)
            .maybeSingle();

        if (onWaitlist) throw new BadRequestException('You are already on the waitlist for this class.');

        // Check duplicate active booking
        const { data: existing } = await service
            .from('reservations')
            .select('id')
            .eq('lesson_id', lessonId)
            .eq('user_id', profile.id)
            .eq('reserved_date', reservedDate)
            .eq('status', 'booked')
            .maybeSingle();

        if (existing) throw new BadRequestException('You already booked this class.');

        // Check capacity
        const { count: bookedCount } = await service
            .from('reservations')
            .select('id', { count: 'exact', head: true })
            .eq('lesson_id', lessonId)
            .eq('reserved_date', reservedDate)
            .eq('status', 'booked');

        const isFull = lesson.capacity_enforced && (bookedCount ?? 0) >= lesson.capacity;

        if (isFull) {
            // Add to waitlist
            const { count: waitlistCount } = await service
                .from('waitlist')
                .select('id', { count: 'exact', head: true })
                .eq('lesson_id', lessonId)
                .eq('reserved_date', reservedDate);

            if ((waitlistCount ?? 0) >= WAITLIST_MAX) {
                throw new BadRequestException('The waitlist for this class is full.');
            }

            const position = (waitlistCount ?? 0) + 1;

            const { data, error } = await service
                .from('waitlist')
                .insert({
                    gym_id: profile.gym_id,
                    user_id: profile.id,
                    lesson_id: lessonId,
                    reserved_date: reservedDate,
                    position,
                })
                .select()
                .single();

            if (error) throw new Error(error.message);
            return { ...data, waitlisted: true, position };
        }

        // Reactivate cancelled booking if exists
        const { data: cancelled } = await service
            .from('reservations')
            .select('id')
            .eq('lesson_id', lessonId)
            .eq('user_id', profile.id)
            .eq('reserved_date', reservedDate)
            .eq('status', 'cancelled')
            .maybeSingle();

        if (cancelled) {
            const { data, error } = await service
                .from('reservations')
                .update({ status: 'booked' })
                .eq('id', cancelled.id)
                .select()
                .single();

            if (error) throw new Error(error.message);
            return { ...data, waitlisted: false };
        }

        // New booking
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
        return { ...data, waitlisted: false };
    }

    // ── CANCEL ────────────────────────────────────────────────────────────────
    async cancel(reservationId: string, jwt: string) {
        const profile = await this.getUserProfile(jwt);
        const service = this.supabase.getServiceClient();

        const { data: reservation } = await service
            .from('reservations')
            .select('id, user_id, gym_id, lesson_id, reserved_date')
            .eq('id', reservationId)
            .single();

        if (!reservation) throw new NotFoundException('Reservation not found');

        if (profile.role === 'member' && reservation.user_id !== profile.id) {
            throw new ForbiddenException('Not your reservation');
        }
        if (reservation.gym_id !== profile.gym_id) {
            throw new ForbiddenException('Not your gym');
        }

        // Cancel the booking
        const { error } = await service
            .from('reservations')
            .update({ status: 'cancelled' })
            .eq('id', reservationId);

        if (error) throw new Error(error.message);

        // Promote first person on waitlist (if any)
        await this.promoteFromWaitlist(
            reservation.lesson_id,
            reservation.reserved_date,
            reservation.gym_id,
            service,
        );

        return { message: 'Booking cancelled' };
    }

    // ── LEAVE WAITLIST ────────────────────────────────────────────────────────
    async leaveWaitlist(waitlistId: string, jwt: string) {
        const profile = await this.getUserProfile(jwt);
        const service = this.supabase.getServiceClient();

        const { data: entry } = await service
            .from('waitlist')
            .select('id, user_id, gym_id, lesson_id, reserved_date, position')
            .eq('id', waitlistId)
            .single();

        if (!entry) throw new NotFoundException('Waitlist entry not found');

        if (entry.user_id !== profile.id) {
            throw new ForbiddenException('Not your waitlist entry');
        }

        // Delete the entry
        await service.from('waitlist').delete().eq('id', waitlistId);

        // Re-number remaining entries
        const { data: remaining } = await service
            .from('waitlist')
            .select('id')
            .eq('lesson_id', entry.lesson_id)
            .eq('reserved_date', entry.reserved_date)
            .gt('position', entry.position)
            .order('position', { ascending: true });

        for (let i = 0; i < (remaining ?? []).length; i++) {
            await service
                .from('waitlist')
                .update({ position: entry.position + i })
                .eq('id', remaining![i].id);
        }

        return { message: 'Removed from waitlist' };
    }

    // ── PROMOTE FROM WAITLIST ─────────────────────────────────────────────────
    private async promoteFromWaitlist(
        lessonId: string,
        reservedDate: string,
        gymId: string,
        service: any,
    ) {
        // Get first person on waitlist
        const { data: first } = await service
            .from('waitlist')
            .select('id, user_id, position')
            .eq('lesson_id', lessonId)
            .eq('reserved_date', reservedDate)
            .order('position', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (!first) return; // No one on waitlist

        // Get user details for email
        const { data: user } = await service
            .from('users')
            .select('id, name, email')
            .eq('id', first.user_id)
            .single();

        // Get lesson details for email
        const { data: lesson } = await service
            .from('lessons')
            .select('id, title, time_of_day')
            .eq('id', lessonId)
            .single();

        // Get gym name for email
        const { data: gym } = await service
            .from('gyms')
            .select('name')
            .eq('id', gymId)
            .single();

        // Check if cancelled reservation exists to reactivate
        const { data: cancelled } = await service
            .from('reservations')
            .select('id')
            .eq('lesson_id', lessonId)
            .eq('user_id', first.user_id)
            .eq('reserved_date', reservedDate)
            .eq('status', 'cancelled')
            .maybeSingle();

        if (cancelled) {
            await service
                .from('reservations')
                .update({ status: 'booked' })
                .eq('id', cancelled.id);
        } else {
            await service
                .from('reservations')
                .insert({
                    gym_id: gymId,
                    user_id: first.user_id,
                    lesson_id: lessonId,
                    reserved_date: reservedDate,
                    status: 'booked',
                });
        }

        // Remove from waitlist
        await service.from('waitlist').delete().eq('id', first.id);

        // Re-number remaining waitlist entries
        const { data: remaining } = await service
            .from('waitlist')
            .select('id')
            .eq('lesson_id', lessonId)
            .eq('reserved_date', reservedDate)
            .order('position', { ascending: true });

        for (let i = 0; i < (remaining ?? []).length; i++) {
            await service
                .from('waitlist')
                .update({ position: i + 1 })
                .eq('id', remaining![i].id);
        }

        // Send email notification
        if (user && lesson && gym) {
            await this.mail.sendWaitlistPromotion({
                to: user.email,
                memberName: user.name,
                gymName: gym.name,
                lessonTitle: lesson.title,
                lessonTime: String(lesson.time_of_day).slice(0, 5),
                date: reservedDate,
            }).catch(console.error); // Don't fail the cancel if email fails
        }
    }

    // ── GET MY BOOKINGS ───────────────────────────────────────────────────────
    async getMyBookings(jwt: string) {
        const profile = await this.getUserProfile(jwt);
        const today = this.getLocalToday();

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

    // ── GET BOOKING COUNTS ────────────────────────────────────────────────────
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

    // ── GET WAITLIST COUNTS ───────────────────────────────────────────────────
    async getWaitlistCounts(gymId: string, date: string) {
        const { data } = await this.supabase.getServiceClient()
            .from('waitlist')
            .select('lesson_id')
            .eq('gym_id', gymId)
            .eq('reserved_date', date);

        const counts: Record<string, number> = {};
        for (const r of data ?? []) {
            counts[r.lesson_id] = (counts[r.lesson_id] ?? 0) + 1;
        }
        return counts;
    }

    // ── GET MY BOOKINGS FOR DATE ──────────────────────────────────────────────
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

    // ── GET MY WAITLIST FOR DATE ──────────────────────────────────────────────
    async getMyWaitlistForDate(userId: string, gymId: string, date: string) {
        const { data } = await this.supabase.getServiceClient()
            .from('waitlist')
            .select('lesson_id, id, position')
            .eq('user_id', userId)
            .eq('gym_id', gymId)
            .eq('reserved_date', date);

        // map: lessonId -> { id, position }
        const map: Record<string, { id: string; position: number }> = {};
        for (const r of data ?? []) {
            map[r.lesson_id] = { id: r.id, position: r.position };
        }
        return map;
    }

    // ── GET CLASS DATA FOR DATE ───────────────────────────────────────────────
    async getClassDataForDate(date: string, jwt: string) {
        const profile = await this.getUserProfile(jwt);

        const [counts, myBookings, waitlistCounts, myWaitlist] = await Promise.all([
            this.getBookingCounts(profile.gym_id, date),
            this.getMyBookingsForDate(profile.id, profile.gym_id, date),
            this.getWaitlistCounts(profile.gym_id, date),
            this.getMyWaitlistForDate(profile.id, profile.gym_id, date),
        ]);

        return { counts, myBookings, waitlistCounts, myWaitlist };
    }

    // ── ADMIN: GET LESSON BOOKINGS ────────────────────────────────────────────
    async getLessonBookings(lessonId: string, date: string, jwt: string) {
        const profile = await this.getUserProfile(jwt);
        if (profile.role !== 'admin' && profile.role !== 'coach') {
            throw new ForbiddenException('Admins only');
        }

        const service = this.supabase.getServiceClient();

        const { data: reservations, error } = await service
            .from('reservations')
            .select('id, reserved_date, status, created_at, user_id')
            .eq('lesson_id', lessonId)
            .eq('gym_id', profile.gym_id)
            .eq('reserved_date', date)
            .eq('status', 'booked')
            .order('created_at', { ascending: true });

        if (error) throw new Error(error.message);
        if (!reservations?.length) return [];

        const userIds = reservations.map((r) => r.user_id);
        const { data: users } = await service
            .from('users')
            .select('id, name, email')
            .in('id', userIds);

        const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]));

        return reservations.map((r) => ({
            ...r,
            user: userMap[r.user_id] ?? { id: r.user_id, name: 'Unknown', email: '' },
        }));
    }
}