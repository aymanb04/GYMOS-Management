import {
    Controller, Get, Post, Patch, Delete,
    Body, Param, Req, UseGuards,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';

@Controller('plans')
@UseGuards(JwtGuard)
export class PlansController {
    constructor(private readonly plansService: PlansService) {}

    @Get()
    findAll(@Req() req: { token: string }) {
        return this.plansService.findAll(req.token);
    }

    @Post()
    create(
        @Body() dto: CreatePlanDto,
        @Req() req: { token: string },
    ) {
        return this.plansService.create(dto, req.token);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() dto: Partial<CreatePlanDto>,
        @Req() req: { token: string },
    ) {
        return this.plansService.update(id, dto, req.token);
    }

    @Delete(':id')
    remove(
        @Param('id') id: string,
        @Req() req: { token: string },
    ) {
        return this.plansService.remove(id, req.token);
    }
}