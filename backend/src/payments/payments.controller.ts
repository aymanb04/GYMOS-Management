import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtGuard } from '../auth/guards/jwt.guard';

@Controller('payments')
@UseGuards(JwtGuard)
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}

    @Get('revenue')
    getRevenue(@Req() req: { token: string }) {
        return this.paymentsService.getRevenue(req.token);
    }
}