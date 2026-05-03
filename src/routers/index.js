import { Router } from 'express';
import authRouter from './auth.js';
import hotelsRouter from './hotels.js';
import bookingsRouter from './bookings.js';
import usersRouter from './users.js';
import recommendationsRouter from './recommendations.js';
import stripeRouter from './stripe.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/hotels', hotelsRouter);
router.use('/bookings', bookingsRouter);
router.use('/users', usersRouter);
router.use('/recommendations', recommendationsRouter);
router.use('/stripe', stripeRouter);

export default router;
