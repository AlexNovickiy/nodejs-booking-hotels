import { BookingsCollection } from '../db/models/booking.js';
import { HotelsCollection } from '../db/models/hotel.js';
import { UsersCollection } from '../db/models/user.js';
import createHttpError from 'http-errors';

// Перевірити перетин дат із існуючими підтвердженими бронюваннями готелю
const checkDateOverlap = async (hotelId, checkIn, checkOut) => {
  return await BookingsCollection.findOne({
    hotelId,
    status: { $in: ['confirmed', 'pending'] },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  });
};

// Перевірити доступність дат перед бронюванням / перед створенням Stripe-сесії
export const validateBookingAvailability = async (userId, hotelId, checkIn, checkOut) => {
  const normalizedCheckIn = new Date(checkIn).toISOString().split('T')[0];
  const normalizedCheckOut = new Date(checkOut).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const userExisting = await BookingsCollection.findOne({
    userId,
    hotelId,
    status: { $in: ['confirmed', 'pending'] },
    checkOut: { $gte: today },
  });

  if (userExisting) {
    throw createHttpError(409, 'You already have an active booking for this hotel');
  }

  const overlap = await checkDateOverlap(hotelId, normalizedCheckIn, normalizedCheckOut);

  if (overlap) {
    throw createHttpError(409, 'These dates are already booked by another guest');
  }
};

export const createBooking = async (userId, bookingData) => {
  const { hotelId, ...rest } = bookingData;

  const [hotel, user] = await Promise.all([
    HotelsCollection.findById(hotelId).select('title imageUrl location price'),
    UsersCollection.findById(userId).select('name email phone'),
  ]);

  if (!hotel) throw createHttpError(404, 'Hotel not found');
  if (!user) throw createHttpError(404, 'User not found');

  const checkIn = new Date(rest.checkIn).toISOString().split('T')[0];
  const checkOut = new Date(rest.checkOut).toISOString().split('T')[0];

  await validateBookingAvailability(userId, hotelId, checkIn, checkOut);

  const newBooking = await BookingsCollection.create({
    ...rest,
    checkIn,
    checkOut,
    hotelId: hotel._id,
    userId: user._id,
    hotel: {
      _id: hotel._id.toString(),
      title: hotel.title,
      imageUrl: hotel.imageUrl,
      location: hotel.location,
      price: hotel.price,
    },
    user: {
      _id: user._id.toString(),
      name: rest.name || user.name,
      email: rest.email || user.email,
      phone: rest.phone || user.phone || '',
    },
    status: 'confirmed',
  });

  return newBooking;
};

// Створити бронювання після підтвердження оплати через Stripe
export const createBookingFromPayment = async ({
  userId,
  hotelId,
  checkIn,
  checkOut,
  guests,
  name,
  email,
  phone,
  specialRequests,
  stripeSessionId,
}) => {
  const [hotel, user] = await Promise.all([
    HotelsCollection.findById(hotelId).select('title imageUrl location price'),
    UsersCollection.findById(userId).select('name email phone'),
  ]);

  if (!hotel) throw createHttpError(404, 'Hotel not found');
  if (!user) throw createHttpError(404, 'User not found');

  await validateBookingAvailability(userId, hotelId, checkIn, checkOut);

  return await BookingsCollection.create({
    hotelId: hotel._id,
    userId: user._id,
    checkIn,
    checkOut,
    guests: Number(guests),
    status: 'confirmed',
    specialRequests: specialRequests || '',
    stripeSessionId,
    hotel: {
      _id: hotel._id.toString(),
      title: hotel.title,
      imageUrl: hotel.imageUrl,
      location: hotel.location,
      price: hotel.price,
    },
    user: {
      _id: user._id.toString(),
      name: name || user.name,
      email: email || user.email,
      phone: phone || user.phone || '',
    },
  });
};

// Отримати бронювання поточного користувача (з авто-завершенням прострочених)
export const getUserBookings = async (userId) => {
  const today = new Date().toISOString().split('T')[0];

  await BookingsCollection.updateMany(
    { userId, status: 'confirmed', checkOut: { $lt: today } },
    { $set: { status: 'completed' } },
  );

  return await BookingsCollection.find({ userId }).sort({ checkIn: 1 });
};

// Перевірити чи є активне бронювання юзера для конкретного готелю
export const getUserHotelBooking = async (userId, hotelId) => {
  const today = new Date().toISOString().split('T')[0];

  return await BookingsCollection.findOne({
    userId,
    hotelId,
    status: { $in: ['confirmed', 'pending'] },
    checkOut: { $gte: today },
  });
};

// Видалити завершене або відмінене бронювання юзера
export const deleteUserBooking = async (userId, bookingId) => {
  const booking = await BookingsCollection.findOne({ _id: bookingId, userId });

  if (!booking) throw createHttpError(404, 'Booking not found');

  if (!['completed', 'cancelled'].includes(booking.status)) {
    throw createHttpError(403, 'Only completed or cancelled bookings can be deleted');
  }

  await BookingsCollection.deleteOne({ _id: bookingId });
};

// Отримати бронювання для конкретного готелю
export const getHotelBookings = async (hotelId) => {
  return await BookingsCollection.find({ hotelId }).sort({ checkIn: 1 });
};
