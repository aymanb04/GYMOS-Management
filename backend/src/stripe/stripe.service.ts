import {
    Injectable,
    BadRequestException,
    ForbiddenException,
    UnauthorizedException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { SupabaseService } from '../supabase.service';

@Injectable()
export class StripeService {
    private stripe: Stripe;

    constructor(private readonly supabase: SupabaseService) {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: '2026-02-25.clover',
        });
    }

    private async getUserProfile(jwt: string) {
        const client = this.supabase.getUserClient(jwt);
        const { data: authData } = await client.auth.getUser();
        if (!authData.user) throw new UnauthorizedException('Invalid token');

        const { data: profile } = await this.supabase.getServiceClient()
            .from('users')
            .select('id, gym_id, role, name, email, stripe_customer_id')
            .eq('id', authData.user.id)
            .single();

        if (!profile) throw new UnauthorizedException('Profile not found');
        return profile;
    }

    // ── CONNECT ONBOARDING ──
    // Admin connects their gym's Stripe account
    async createConnectOnboardingLink(jwt: string, returnUrl: string) {
        const profile = await this.getUserProfile(jwt);
        if (profile.role !== 'admin') throw new ForbiddenException('Admins only');

        const { data: gym } = await this.supabase.getServiceClient()
            .from('gyms')
            .select('id, name, stripe_account_id')
            .eq('id', profile.gym_id)
            .single();

        if (!gym) throw new BadRequestException('Gym not found');

        let accountId = gym.stripe_account_id;

        // Create a new Connect account if none exists
        if (!accountId) {
            const account = await this.stripe.accounts.create({
                type: 'express',
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                business_profile: {
                    name: gym.name,
                },
            });

            accountId = account.id;

            await this.supabase.getServiceClient()
                .from('gyms')
                .update({ stripe_account_id: accountId })
                .eq('id', gym.id);
        }

        // Create onboarding link
        const accountLink = await this.stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${returnUrl}?stripe=refresh`,
            return_url: `${returnUrl}?stripe=success`,
            type: 'account_onboarding',
        });

        return { url: accountLink.url };
    }

    // Check if gym's Stripe account is fully connected
    async getConnectStatus(jwt: string) {
        const profile = await this.getUserProfile(jwt);
        if (profile.role !== 'admin') throw new ForbiddenException('Admins only');

        const { data: gym } = await this.supabase.getServiceClient()
            .from('gyms')
            .select('stripe_account_id')
            .eq('id', profile.gym_id)
            .single();

        if (!gym?.stripe_account_id) {
            return { connected: false, accountId: null };
        }

        try {
            const account = await this.stripe.accounts.retrieve(gym.stripe_account_id);
            return {
                connected: account.charges_enabled && account.payouts_enabled,
                chargesEnabled: account.charges_enabled,
                payoutsEnabled: account.payouts_enabled,
                accountId: gym.stripe_account_id,
            };
        } catch {
            return { connected: false, accountId: gym.stripe_account_id };
        }
    }

    // ── CHECKOUT ──
    // Member pays for a membership plan
    async createCheckoutSession(planId: string, jwt: string, successUrl: string, cancelUrl: string) {
        const profile = await this.getUserProfile(jwt);

        const serviceClient = this.supabase.getServiceClient();

        // Get plan details
        const { data: plan } = await serviceClient
            .from('membership_plans')
            .select('id, name, price, duration_months, gym_id')
            .eq('id', planId)
            .eq('gym_id', profile.gym_id)
            .single();

        if (!plan) throw new BadRequestException('Plan not found');

        // Get gym's Stripe account
        const { data: gym } = await serviceClient
            .from('gyms')
            .select('stripe_account_id, name')
            .eq('id', profile.gym_id)
            .single();

        if (!gym?.stripe_account_id) {
            throw new BadRequestException('This gym has not connected their payment account yet.');
        }

        // Get or create Stripe customer
        let customerId = profile.stripe_customer_id;
        if (!customerId) {
            const customer = await this.stripe.customers.create({
                email: profile.email,
                name: profile.name,
            }, { stripeAccount: gym.stripe_account_id });

            customerId = customer.id;

            await serviceClient
                .from('users')
                .update({ stripe_customer_id: customerId })
                .eq('id', profile.id);
        }

        const amountCents = Math.round(Number(plan.price) * 100);
        const platformFeeCents = Math.round(amountCents * (Number(process.env.PLATFORM_FEE_PERCENT ?? 1) / 100));

        // Create checkout session on the gym's connected account
        const session = await this.stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        unit_amount: amountCents,
                        product_data: {
                            name: `${plan.name} — ${gym.name}`,
                            description: `${plan.duration_months} month${plan.duration_months > 1 ? 's' : ''} membership`,
                        },
                    },
                    quantity: 1,
                },
            ],
            payment_intent_data: {
                application_fee_amount: platformFeeCents,
            },
            success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl,
            metadata: {
                user_id: profile.id,
                plan_id: planId,
                gym_id: profile.gym_id,
                duration_months: String(plan.duration_months),
            },
        }, { stripeAccount: gym.stripe_account_id });

        // Create a pending payment record
        await serviceClient
            .from('payments')
            .insert({
                gym_id: profile.gym_id,
                user_id: profile.id,
                amount: plan.price,
                status: 'pending',
                stripe_session_id: session.id,
                membership_plan_id: planId,  // ← voeg dit toe
            });

        return { url: session.url, sessionId: session.id };
    }

    // ── WEBHOOK ──
    // Called by Stripe when payment completes
    async handleWebhook(payload: Buffer, signature: string, stripeAccountId: string) {
        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(
                payload,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET!,
            );
        } catch (err) {
            throw new BadRequestException(`Webhook signature verification failed: ${err}`);
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            await this.handlePaymentSuccess(session, stripeAccountId);
        }

        return { received: true };
    }

    private async handlePaymentSuccess(session: Stripe.Checkout.Session, stripeAccountId: string) {
        const { user_id, plan_id, gym_id, duration_months } = session.metadata ?? {};
        if (!user_id || !plan_id || !gym_id) return;

        const serviceClient = this.supabase.getServiceClient();

        // Update payment record to paid
        await serviceClient
            .from('payments')
            .update({
                status: 'paid',
                stripe_session_id: session.id,
                stripe_payment_intent_id: String(session.payment_intent ?? ''),
            })
            .eq('stripe_session_id', session.id);

        // Set membership expiry
        const months = Number(duration_months ?? 1);
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + months);

        await serviceClient
            .from('users')
            .update({
                membership_plan_id: plan_id,
                membership_expires_at: expiry.toISOString(),
                active: true,
            })
            .eq('id', user_id)
            .eq('gym_id', gym_id);
    }
}