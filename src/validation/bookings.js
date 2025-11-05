import Joi from 'joi';

// Схема из `BookingForm.tsx`
export const createBookingSchema = Joi.object({
  hotelId: Joi.string().required(), // `hotelId` будет из URL или тела
  checkIn: Joi.date().iso().required(),
  checkOut: Joi.date().iso().greater(Joi.ref('checkIn')).required(),
  guests: Joi.number().min(1).required(),
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  specialRequests: Joi.string().allow('').optional(),
});
