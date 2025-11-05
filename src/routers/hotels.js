import { Router } from 'express';
import {
  getHotelsController,
  getHotelByIdController,
  createHotelController,
  deleteHotelController,
  updateHotelController,
  getMyListingsController,
  createReviewController,
  getClassificationController,
} from '../controllers/hotels.js';
import { ctrlWrapper } from '../utils/ctrlWrapper.js';
import { validateBody } from '../middlewares/validateBody.js';
import {
  createHotelSchema,
  updateHotelSchema,
  createReviewSchema,
} from '../validation/hotels.js';
import { isValidId } from '../middlewares/isValidId.js';
import { authenticate } from '../middlewares/authenticate.js';
import { upload } from '../middlewares/multer.js';

const hotelsRouter = Router();

// --- Публичные роуты ---
hotelsRouter.get('/', ctrlWrapper(getHotelsController));
hotelsRouter.get('/classification', ctrlWrapper(getClassificationController));
hotelsRouter.get(
  '/:hotelId',
  isValidId('hotelId'),
  ctrlWrapper(getHotelByIdController),
);

// --- Приватные роуты (требуют аутентификации) ---
hotelsRouter.use(authenticate);

hotelsRouter.get('/my/listings', ctrlWrapper(getMyListingsController)); // Перехватываем /my/listings до /:hotelId

hotelsRouter.post(
  '/',
  upload.single('image'),
  validateBody(createHotelSchema),
  ctrlWrapper(createHotelController),
);

hotelsRouter.delete(
  '/:hotelId',
  isValidId('hotelId'),
  ctrlWrapper(deleteHotelController),
);

hotelsRouter.patch(
  '/:hotelId',
  isValidId('hotelId'),
  upload.single('image'),
  validateBody(updateHotelSchema),
  ctrlWrapper(updateHotelController),
);

// Роут для добавления отзывов
hotelsRouter.post(
  '/:hotelId/reviews',
  isValidId('hotelId'),
  validateBody(createReviewSchema),
  ctrlWrapper(createReviewController),
);

export default hotelsRouter;
