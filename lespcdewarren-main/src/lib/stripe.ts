import Stripe from "stripe";
import { getStripeConfig } from "./settings";

// Instance Stripe (singleton)
let stripeInstance: Stripe | null = null;

async function getStripeInstance(): Promise<Stripe> {
  if (stripeInstance) return stripeInstance;

  const config = await getStripeConfig();
  stripeInstance = new Stripe(config.secretKey, {
    apiVersion: "2025-12-15.clover",
  });

  return stripeInstance;
}

export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  const config = await getStripeConfig();
  const stripe = new Stripe(config.secretKey, {
    apiVersion: "2025-12-15.clover",
  });

  return stripe.webhooks.constructEvent(
    payload,
    signature,
    config.webhookSecret
  );
}

// Export getStripeInstance pour utilisation dans les routes API
export { getStripeInstance };
