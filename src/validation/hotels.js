import Joi from 'joi';

// Схема для создания отеля (картинка обрабатывается отдельно)
export const createHotelSchema = Joi.object({
  title: Joi.string().min(5).max(100).required(),
  location: Joi.string().min(3).max(50).required(),
  price: Joi.number().min(1).required(),
  description: Joi.string().min(20).max(2000).required(),
});

// Схема для обновления отеля (все поля опциональны)
export const updateHotelSchema = Joi.object({
  title: Joi.string().min(5).max(100),
  location: Joi.string().min(3).max(50),
  price: Joi.number().min(1),
  description: Joi.string().min(20).max(2000),
});

// Схема для создания отзыва (из `lib/types.ts` и `ReviewForm.tsx`)
export const createReviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  text: Joi.string().min(10).max(1000).required(),
  cleanliness_score: Joi.number().min(1).max(5).required(),
  location_score: Joi.number().min(1).max(5).required(),
});
