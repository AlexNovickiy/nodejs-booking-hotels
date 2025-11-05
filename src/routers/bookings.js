import { Router } from 'express';
import { ctrlWrapper } from '../utils/ctrlWrapper.js';
import {
  createBookingController,
  getMyBookingsController,
  getHotelBookingsController,
} from '../controllers/bookings.js';
import { validateBody } from '../middlewares/validateBody.js';
import { createBookingSchema } from '../validation/bookings.js';
import { isValidId } from '../middlewares/isValidId.js';
import { authenticate } from '../middlewares/authenticate.js';

const bookingsRouter = Router();

// Роут для получения дат бронирования отеля (публичный, для календаря)
bookingsRouter.get(
  '/hotel/:hotelId',
  isValidId('hotelId'),
  ctrlWrapper(getHotelBookingsController),
);

// --- Приватные роуты ---
bookingsRouter.use(authenticate);

bookingsRouter.post(
  '/',
  validateBody(createBookingSchema),
  ctrlWrapper(createBookingController),
);

bookingsRouter.get('/my-bookings', ctrlWrapper(getMyBookingsController));

export default bookingsRouter;
