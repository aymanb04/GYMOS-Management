import * as common from '@nestjs/common';
import {Request} from 'express';
import {StripeService} from './stripe.service';
import {JwtGuard} from '../auth/guards/jwt.guard';


@common.Controller('stripe')
export class StripeController {
    constructor(private readonly stripeService: StripeService) {
    }

    // Admin — start Connect onboarding
    @common.Post('connect/onboard')
    @common.UseGuards(JwtGuard)
    createOnboardingLink(
        @common.Body('returnUrl') returnUrl: string,
        @common.Req() req: { token: string },
    ) {
        return this.stripeService.createConnectOnboardingLink(req.token, returnUrl);
    }

    // Admin — check Connect status
    @common.Get('connect/status')
    @common.UseGuards(JwtGuard)
    getConnectStatus(@common.Req() req: { token: string }) {
        return this.stripeService.getConnectStatus(req.token);
    }

    // Member — create checkout session to pay for a plan
    @common.Post('checkout')
    @common.UseGuards(JwtGuard)
    createCheckout(
        @common.Body() dto: { planId: string; successUrl: string; cancelUrl: string },
        @common.Req() req: { token: string },
    ) {
        return this.stripeService.createCheckoutSession(
            dto.planId,
            req.token,
            dto.successUrl,
            dto.cancelUrl,
        );
    }

    // Stripe webhook — no auth, verified by signature
    @common.Post('webhook')
    @common.HttpCode(200)
    async handleWebhook(
        @common.Req() req: common.RawBodyRequest<Request>,
        @common.Headers('stripe-signature') signature: string,
        @common.Headers('stripe-account') stripeAccount: string,
    ) {
        return this.stripeService.handleWebhook(
            req.rawBody!,
            signature,
            stripeAccount,
        );
    }
}