import { SORT_ORDER } from '../constants/index.js';
import { HotelsCollection } from '../db/models/hotel.js';
import { UsersCollection } from '../db/models/user.js';
import { calculatePaginationData } from '../utils/calculatePaginationData.js';
import createHttpError from 'http-errors';

// Сервис для получения списка всех отелей с пагинацией и поиском
export const getAllHotels = async ({
  page = 1,
  perPage = 10,
  sortOrder = SORT_ORDER.ASC,
  sortBy = '_id',
  filter = {},
}) => {
  const limit = perPage;
  const skip = (page - 1) * perPage;

  const query = {};

  // Фильтр для поиска (по `title` и `location`)
  if (filter.q) {
    query.$or = [
      { title: { $regex: filter.q, $options: 'i' } },
      { location: { $regex: filter.q, $options: 'i' } },
    ];
  }
  // TODO: Добавить фильтр по `guests` (нужно будет изменить схему отеля, добавив maxGuests)
  if (filter.guests) {
    query.maxGuests = { $gte: filter.guests };
  }
  const hotelsQuery = HotelsCollection.find(query);

  const [hotelsCount, hotels] = await Promise.all([
    HotelsCollection.find().merge(hotelsQuery).countDocuments(),
    hotelsQuery
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder })
      .exec(),
  ]);

  const paginationData = calculatePaginationData(hotelsCount, perPage, page);

  return { hotels, ...paginationData };
};

// Получение отелей для конкретного владельца
export const getUserHotels = async (userId) => {
  return await HotelsCollection.find({ ownerId: userId }).sort({
    createdAt: -1,
  });
};

// Получение одного отеля по ID
export const getHotelById = async (hotelId) => {
  const hotel = await HotelsCollection.findById(hotelId);
  return hotel;
};

// Создание нового отеля
export const createHotel = async (payload) => {
  const hotel = await HotelsCollection.create(payload);
  return hotel;
};

// Обновление отеля
export const updateHotel = async (hotelId, userId, payload, options = {}) => {
  const hotel = await HotelsCollection.findOne({ _id: hotelId });

  if (!hotel) {
    throw createHttpError(404, 'Hotel not found');
  }

  // Проверка, что пользователь обновляет свое объявление
  if (hotel.ownerId.toString() !== userId.toString()) {
    throw createHttpError(
      403,
      'Forbidden: You can only edit your own listings',
    );
  }

  const rawResult = await HotelsCollection.findOneAndUpdate(
    { _id: hotelId },
    payload,
    {
      new: true,
      ...options,
    },
  );

  return rawResult;
};

// Удаление отеля
export const deleteHotel = async (hotelId, userId) => {
  const hotel = await HotelsCollection.findOne({ _id: hotelId });

  if (!hotel) {
    throw createHttpError(404, 'Hotel not found');
  }

  // Проверка, что пользователь удаляет свое объявление
  if (hotel.ownerId.toString() !== userId.toString()) {
    throw createHttpError(
      403,
      'Forbidden: You can only delete your own listings',
    );
  }

  return await HotelsCollection.findOneAndDelete({ _id: hotelId });
};

// Добавление отзыва
export const createReview = async (hotelId, userId, reviewData) => {
  // Проверяем, что пользователь существует
  const user = await UsersCollection.findById(userId);
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  // Формируем новый отзыв (без _id: Mongo автоматически добавит _id при сохранении в БД)
  const newReview = {
    ...reviewData,
    userId: user._id,
    user: {
      name: user.name,
      photo: user.photo,
    },
    date: new Date().toISOString().split('T')[0],
  };

  // Атомарно добавляем отзыв в массив и пересчитываем summary на стороне MongoDB,
  // чтобы избежать гонок (чтение->модификация->save). Используем update-pipeline (MongoDB 4.2+).
  const updated = await HotelsCollection.findOneAndUpdate(
    { _id: hotelId },
    [
      // 1) Добавляем новый отзыв к массиву (защищаемся через $ifNull на случай отсутствия поля)
      {
        $set: {
          reviews: {
            $concatArrays: [{ $ifNull: ['$reviews', []] }, [newReview]],
          },
        },
      },
      // 2) Пересчитываем поля в ratings_summary на основе обновлённого массива reviews
      {
        $set: {
          'ratings_summary.total_reviews': { $size: '$reviews' },
          'ratings_summary.average_rating': {
            $cond: [
              { $gt: [{ $size: '$reviews' }, 0] },
              { $avg: '$reviews.rating' },
              0,
            ],
          },
          'ratings_summary.cleanliness_score': {
            $cond: [
              { $gt: [{ $size: '$reviews' }, 0] },
              { $avg: '$reviews.cleanliness_score' },
              0,
            ],
          },
          'ratings_summary.location_score': {
            $cond: [
              { $gt: [{ $size: '$reviews' }, 0] },
              { $avg: '$reviews.location_score' },
              0,
            ],
          },
        },
      },
    ],
    { new: true },
  );

  if (!updated) {
    throw createHttpError(404, 'Hotel not found');
  }

  // Возвращаем только добавленный отзыв (интерфейс совместим с предыдущей реализацией)
  return updated.reviews[updated.reviews.length - 1];
};

// Для страницы "Classification"
export const getAllClassifications = async () => {
  const fields = { _id: 1, title: 1, ratings_summary: 1 };

  const [average, cleanliness, location] = await Promise.all([
    HotelsCollection.find()
      .sort({ 'ratings_summary.average_rating': -1 })
      .select(fields)
      .limit(10), // Ограничим для примера
    HotelsCollection.find()
      .sort({ 'ratings_summary.cleanliness_score': -1 })
      .select(fields)
      .limit(10),
    HotelsCollection.find()
      .sort({ 'ratings_summary.location_score': -1 })
      .select(fields)
      .limit(10),
  ]);

  // Форматируем под `ClassificationHotel` из `lib/types.ts`
  const format = (hotels, scoreField) =>
    hotels.map((h) => ({
      id: h._id.toString(),
      title: h.title,
      score: h.ratings_summary[scoreField] || 0,
    }));

  return {
    average: format(average, 'average_rating'),
    cleanliness: format(cleanliness, 'cleanliness_score'),
    location: format(location, 'location_score'),
  };
};
