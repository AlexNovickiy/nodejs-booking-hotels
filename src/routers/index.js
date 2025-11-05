import { Router } from 'express';
import authRouter from './auth.js';
import hotelsRouter from './hotels.js';
import bookingsRouter from './bookings.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/hotels', hotelsRouter);
router.use('/bookings', bookingsRouter);

export default router;
