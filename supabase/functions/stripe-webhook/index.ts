import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'npm:stripe';
import { createClient } from 'npm:@supabase/supabase-js';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Webhook signature failed', { status: 400 });
  }

  console.log(`Processing Stripe event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      // ── Subscription created or updated ──────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          const userId = subscription.metadata.user_id || session.metadata?.user_id;
          const planId = subscription.metadata.plan_id || session.metadata?.plan_id;
          if (userId) {
            await upsertSubscription(userId, planId, subscription);
          }
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.user_id;
        const planId = subscription.metadata.plan_id;
        if (userId) {
          await upsertSubscription(userId, planId, subscription);
        }
        break;
      }

      // ── Subscription canceled ─────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.user_id;
        if (userId) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              canceled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
        }
        break;
      }

      // ── Payment succeeded ─────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await supabase
            .from('subscriptions')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', invoice.subscription as string);
        }
        break;
      }

      // ── Payment failed ────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', invoice.subscription as string);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Log all events to billing_events
    const obj = event.data.object as Record<string, unknown>;
    const userId = (obj?.metadata as Record<string, string> | undefined)?.user_id;

    await supabase.from('billing_events').insert({
      user_id: userId || null,
      event_type: event.type,
      stripe_event_id: event.id,
      data: event.data.object,
    });

  } catch (err) {
    console.error('Error processing webhook:', err);
    // Still return 200 so Stripe doesn't retry immediately
    return new Response('Processing error logged', { status: 200 });
  }

  return new Response('OK', { status: 200 });
});

// ── Helper: upsert subscription row ──────────────────────────
async function upsertSubscription(
  userId: string,
  planId: string | undefined,
  subscription: Stripe.Subscription
) {
  const priceItem = subscription.items.data[0];
  const interval = priceItem?.price?.recurring?.interval;
  const billingCycle = interval === 'year' ? 'yearly' : 'monthly';

  await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      plan_id: planId || 'starter',
      billing_cycle: billingCycle,
      status: subscription.status,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceItem?.price?.id,
      current_period_start: new Date((subscription as unknown as { current_period_start: number }).current_period_start * 1000).toISOString(),
      current_period_end: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
}
