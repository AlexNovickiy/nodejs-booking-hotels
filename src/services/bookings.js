import { BookingsCollection } from '../db/models/booking.js';
import { HotelsCollection } from '../db/models/hotel.js';
import { UsersCollection } from '../db/models/user.js';
import createHttpError from 'http-errors';

export const createBooking = async (userId, bookingData) => {
  const { hotelId, ...rest } = bookingData;

  // 1. Найти отель и пользователя для денормализации
  const [hotel, user] = await Promise.all([
    HotelsCollection.findById(hotelId).select('title imageUrl location price'),
    UsersCollection.findById(userId).select('name email phone'),
  ]);

  if (!hotel) {
    throw createHttpError(404, 'Hotel not found');
  }
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  // TODO: Проверить, не пересекаются ли даты с существующими бронированиями
  // (для production-ready)

  const newBooking = await BookingsCollection.create({
    ...rest,
    checkIn: new Date(rest.checkIn).toISOString().split('T')[0],
    checkOut: new Date(rest.checkOut).toISOString().split('T')[0],
    hotelId: hotel._id,
    userId: user._id,
    // Денормализованные данные
    hotel: {
      id: hotel._id.toString(),
      title: hotel.title,
      imageUrl: hotel.imageUrl,
      location: hotel.location,
      price: hotel.price,
    },
    user: {
      id: user._id.toString(),
      name: rest.name || user.name,
      email: rest.email || user.email,
      phone: rest.phone || user.phone || '',
    },
    status: 'confirmed', // По умолчанию подтверждено
  });

  return newBooking;
};

// Получить бронирования ТЕКУЩЕГО пользователя
export const getUserBookings = async (userId) => {
  return await BookingsCollection.find({ userId }).sort({ checkIn: 1 });
};

// Получить бронирования для КОНКРЕТНОГО отеля
export const getHotelBookings = async (hotelId) => {
  return await BookingsCollection.find({ hotelId }).select('checkIn checkOut');
};
