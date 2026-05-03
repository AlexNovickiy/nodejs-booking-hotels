import { Router } from 'express';
import { ctrlWrapper } from '../utils/ctrlWrapper.js';
import { createCheckoutSessionController } from '../controllers/stripe.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validateBody } from '../middlewares/validateBody.js';
import { createBookingSchema } from '../validation/bookings.js';

const stripeRouter = Router();

// POST /stripe/create-checkout-session
stripeRouter.post(
  '/create-checkout-session',
  authenticate,
  validateBody(createBookingSchema),
  ctrlWrapper(createCheckoutSessionController),
);

export default stripeRouter;
