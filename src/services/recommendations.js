import { HotelsCollection } from '../db/models/hotel.js';
import { BookingsCollection } from '../db/models/booking.js';

// ── Математические утилиты ────────────────────────────────────────────────────

function normalize(value, min, max) {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

// Косинусное сходство между двумя векторами одинаковой длины
function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

// ── Построение векторов признаков ────────────────────────────────────────────

/**
 * Вектор отеля: [price_norm, avg_rating_norm, cleanliness_norm, location_norm, capacity_norm]
 * Все компоненты в диапазоне [0, 1].
 */
function buildHotelVector(hotel, priceMin, priceMax, capMin, capMax) {
  return [
    normalize(hotel.price || 0, priceMin, priceMax),
    (hotel.ratings_summary?.average_rating || 0) / 5,
    (hotel.ratings_summary?.cleanliness_score || 0) / 5,
    (hotel.ratings_summary?.location_score || 0) / 5,
    normalize(hotel.maxGuests || 0, capMin, capMax),
  ];
}

/**
 * Профиль пользователя — взвешенное среднее векторов отелей, которые он бронировал.
 * Вес = оценка пользователя / 5 (если оставил отзыв), иначе 0.6 (нейтральный).
 */
function buildUserProfile(bookedHotels, userId, priceMin, priceMax, capMin, capMax) {
  const DIM = 5;
  const weightedSum = new Array(DIM).fill(0);
  let totalWeight = 0;

  for (const hotel of bookedHotels) {
    // Ищем отзыв этого пользователя в массиве отзывов отеля
    const userReview = hotel.reviews?.find(
      (r) => r.userId?.toString() === userId.toString(),
    );
    const weight = userReview ? userReview.rating / 5 : 0.6;

    const vec = buildHotelVector(hotel, priceMin, priceMax, capMin, capMax);
    for (let i = 0; i < DIM; i++) {
      weightedSum[i] += vec[i] * weight;
    }
    totalWeight += weight;
  }

  if (totalWeight === 0) return null;
  return weightedSum.map((v) => v / totalWeight);
}

// ── Публичная функция ─────────────────────────────────────────────────────────

/**
 * Возвращает topN отелей, наиболее похожих на предпочтения пользователя.
 * Если у пользователя нет истории бронирований — возвращает топ по рейтингу (cold-start fallback).
 */
export const getRecommendations = async (userId, topN = 5) => {
  // 1. История бронирований пользователя
  const bookings = await BookingsCollection.find({ userId }).lean();
  const bookedHotelIds = [...new Set(bookings.map((b) => b.hotelId.toString()))];

  // 2. Все отели для построения диапазонов нормализации
  const allHotels = await HotelsCollection.find().lean();

  if (allHotels.length === 0) return [];

  // 3. Диапазоны для нормализации
  const prices = allHotels.map((h) => h.price || 0);
  const capacities = allHotels.map((h) => h.maxGuests || 0);
  const priceMin = Math.min(...prices);
  const priceMax = Math.max(...prices);
  const capMin = Math.min(...capacities);
  const capMax = Math.max(...capacities);

  // ── Cold-start: нет истории → возвращаем топ по рейтингу ──────────────────
  if (bookedHotelIds.length === 0) {
    const topByRating = [...allHotels]
      .sort(
        (a, b) =>
          (b.ratings_summary?.average_rating || 0) -
          (a.ratings_summary?.average_rating || 0),
      )
      .slice(0, topN);

    return topByRating.map((h) => ({
      ...h,
      similarity_score: null, // нет персонализации
      recommendation_reason: 'top_rated',
    }));
  }

  // 4. Загружаем только те отели, которые пользователь бронировал
  const bookedHotels = allHotels.filter((h) =>
    bookedHotelIds.includes(h._id.toString()),
  );

  // 5. Строим профиль пользователя
  const userProfile = buildUserProfile(
    bookedHotels,
    userId,
    priceMin,
    priceMax,
    capMin,
    capMax,
  );

  if (!userProfile) return [];

  // 6. Считаем косинусное сходство для каждого ещё не посещённого отеля
  const candidates = allHotels.filter(
    (h) => !bookedHotelIds.includes(h._id.toString()),
  );

  const scored = candidates.map((hotel) => {
    const vec = buildHotelVector(hotel, priceMin, priceMax, capMin, capMax);
    const score = cosineSimilarity(userProfile, vec);
    return { ...hotel, similarity_score: parseFloat(score.toFixed(4)), recommendation_reason: 'personalized' };
  });

  // 7. Сортируем по убыванию сходства и возвращаем topN
  scored.sort((a, b) => b.similarity_score - a.similarity_score);
  return scored.slice(0, topN);
};
