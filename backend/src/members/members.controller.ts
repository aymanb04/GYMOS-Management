import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Req,
    UseGuards,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';

@Controller('members')
@UseGuards(JwtGuard)
export class MembersController {
    constructor(private readonly membersService: MembersService) {}

    // ⚠ Static routes MUST come before parameterized routes (:id)

    @Get('me')
    getMyProfile(@Req() req: { token: string }) {
        return this.membersService.getMyProfile(req.token);
    }

    @Patch('me')
    updateMe(
        @Body() dto: { name?: string; password?: string },
        @Req() req: { token: string },
    ) {
        return this.membersService.updateMe(dto, req.token);
    }

    @Get('plans')
    getPlans(@Req() req: { token: string }) {
        return this.membersService.getPlans(req.token);
    }

    @Get()
    findAll(@Req() req: { token: string }) {
        return this.membersService.findAll(req.token);
    }

    @Post()
    create(
        @Body() dto: CreateMemberDto,
        @Req() req: { token: string },
    ) {
        return this.membersService.create(dto, req.token);
    }

    @Patch(':id/status')
    toggleStatus(
        @Param('id') id: string,
        @Req() req: { token: string },
    ) {
        return this.membersService.toggleStatus(id, req.token);
    }

    @Patch(':id/plan')
    assignPlan(
        @Param('id') id: string,
        @Body('planId') planId: string | null,
        @Req() req: { token: string },
    ) {
        return this.membersService.assignPlan(id, planId, req.token);
    }
}