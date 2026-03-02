import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { GymsService } from './gyms.service';
import { JwtGuard } from '../auth/guards/jwt.guard';

@Controller('gyms')
export class GymsController {
    constructor(private readonly gymsService: GymsService) {}

    // Public — list all gyms (used internally)
    @Get()
    findAll() {
        return this.gymsService.findAll();
    }

    // Public — resolve subdomain to gym config
    // Called by GymContext on every page load: GET /api/gyms/resolve?subdomain=sga
    @Get('resolve')
    resolve(@Query('subdomain') subdomain: string) {
        return this.gymsService.resolveBySubdomain(subdomain);
    }

    // Protected — dashboard stats
    @Get(':gymId/stats')
    @UseGuards(JwtGuard)
    getStats(
        @Param('gymId') gymId: string,
        @Req() req: { token: string },
    ) {
        return this.gymsService.getStats(gymId, req.token);
    }

    // Protected — member list
    @Get(':gymId/members')
    @UseGuards(JwtGuard)
    getMembers(
        @Param('gymId') gymId: string,
        @Req() req: { token: string },
    ) {
        return this.gymsService.getMembers(gymId, req.token);
    }
}