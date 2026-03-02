export class MembershipPlanDto {
    name: string;
    price: number;
    duration_months: number;
}

export class ActiveMembershipDto {
    id: string;
    name: string;
    email: string;
    role: string;
    membership_expires_at: string;
    membership_plan: MembershipPlanDto;
}
