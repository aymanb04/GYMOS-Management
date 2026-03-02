import { Controller, Get } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { ActiveMembershipDto } from './dto/active-membership.dto';

@Controller('memberships')
export class MembershipsController {
    constructor(private membershipsService: MembershipsService) {}

    @Get('active')
    async getActiveMemberships(): Promise<ActiveMembershipDto[]> {
        return this.membershipsService.getActiveMemberships();
    }
}
