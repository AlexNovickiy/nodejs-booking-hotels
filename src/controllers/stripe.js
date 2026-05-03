import { createCheckoutSession, handleStripeWebhook } from '../services/stripe.js';

export const createCheckoutSessionController = async (req, res) => {
  const userId = req.user._id;
  const data = await createCheckoutSession(userId, req.body);

  res.status(200).json({
    status: 200,
    message: 'Checkout session created',
    data,
  });
};

export const stripeWebhookController = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const data = await handleStripeWebhook(req.body, signature);

  res.status(200).json(data);
};
