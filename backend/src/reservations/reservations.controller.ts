import {
    Controller, Get, Post, Delete,
    Body, Param, Query, Req, UseGuards,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { JwtGuard } from '../auth/guards/jwt.guard';

@Controller('reservations')
@UseGuards(JwtGuard)
export class ReservationsController {
    constructor(private readonly reservationsService: ReservationsService) {}

    // Member: get my upcoming bookings
    @Get('me')
    getMyBookings(@Req() req: { token: string }) {
        return this.reservationsService.getMyBookings(req.token);
    }

    // Member portal: get booking counts + waitlist counts + my bookings for a date
    @Get('date/:date')
    getClassDataForDate(
        @Param('date') date: string,
        @Req() req: { token: string },
    ) {
        return this.reservationsService.getClassDataForDate(date, req.token);
    }

    // Member: book a class (returns waitlisted: true/false)
    @Post()
    book(
        @Body() dto: { lessonId: string; date: string },
        @Req() req: { token: string },
    ) {
        return this.reservationsService.book(dto.lessonId, dto.date, req.token);
    }

    // Member: cancel a booking
    @Delete(':id')
    cancel(
        @Param('id') id: string,
        @Req() req: { token: string },
    ) {
        return this.reservationsService.cancel(id, req.token);
    }

    // Member: leave waitlist
    @Delete('waitlist/:id')
    leaveWaitlist(
        @Param('id') id: string,
        @Req() req: { token: string },
    ) {
        return this.reservationsService.leaveWaitlist(id, req.token);
    }

    // Admin: get bookings for a specific lesson + date
    @Get('lesson/:lessonId')
    getLessonBookings(
        @Param('lessonId') lessonId: string,
        @Query('date') date: string,
        @Req() req: { token: string },
    ) {
        return this.reservationsService.getLessonBookings(lessonId, date, req.token);
    }
}