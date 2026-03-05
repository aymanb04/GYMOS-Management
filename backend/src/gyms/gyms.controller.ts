import { Controller, Get, Patch, Param, Query, Body, Req, UseGuards } from '@nestjs/common';
import { GymsService } from './gyms.service';
import { JwtGuard } from '../auth/guards/jwt.guard';

@Controller('gyms')
export class GymsController {
    constructor(private readonly gymsService: GymsService) {}

    @Get()
    findAll() {
        return this.gymsService.findAll();
    }

    @Get('resolve')
    resolve(@Query('subdomain') subdomain: string) {
        return this.gymsService.resolveBySubdomain(subdomain);
    }

    @Patch(':gymId')
    @UseGuards(JwtGuard)
    updateGym(
        @Param('gymId') gymId: string,
        @Body() dto: { name?: string; brand_color?: string },
        @Req() req: { token: string },
    ) {
        return this.gymsService.updateGym(gymId, dto, req.token);
    }

    @Get(':gymId/stats')
    @UseGuards(JwtGuard)
    getStats(
        @Param('gymId') gymId: string,
        @Req() req: { token: string },
    ) {
        return this.gymsService.getStats(gymId, req.token);
    }

    @Get(':gymId/members')
    @UseGuards(JwtGuard)
    getMembers(
        @Param('gymId') gymId: string,
        @Req() req: { token: string },
    ) {
        return this.gymsService.getMembers(gymId, req.token);
    }
}