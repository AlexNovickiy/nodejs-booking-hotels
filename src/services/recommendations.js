import { HotelsCollection } from '../db/models/hotel.js';
import { BookingsCollection } from '../db/models/booking.js';

// ── Математичні утиліти

function normalize(value, min, max) {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

// Косинусна подібність між двома векторами однакової довжини
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

// ── Побудова векторів ознак ────────────────────────────────────────────

/**
 * Вектор готелю: [price_norm, avg_rating_norm, cleanliness_norm, location_norm, capacity_norm]
 * Усі компоненти в діапазоні [0, 1].
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
 * Профіль користувача — зважене середнє векторів готелів, які він бронював.
 * Вага = оцінка користувача / 5 (якщо залишив відгук), інакше 0,6 (нейтральний).
 */
function buildUserProfile(
  bookedHotels,
  userId,
  priceMin,
  priceMax,
  capMin,
  capMax,
) {
  const DIM = 5;
  const weightedSum = new Array(DIM).fill(0);
  let totalWeight = 0;

  for (const hotel of bookedHotels) {
    // Шукаємо відгук цього користувача в масиві відгуків про готель
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

// ── Публічна функція

/**
 * Повертає topN готелів, які найбільше відповідають уподобанням користувача.
 * Якщо у користувача немає історії бронювань — повертає топ за рейтингом (cold-start fallback).
 */
export const getRecommendations = async (userId, topN = 5) => {
  // 1. Історія бронювань користувача
  const bookings = await BookingsCollection.find({ userId }).lean();
  const bookedHotelIds = [
    ...new Set(bookings.map((b) => b.hotelId.toString())),
  ];

  // 2. Усі готелі для побудови діапазонів нормалізації
  const allHotels = await HotelsCollection.find().lean();

  if (allHotels.length === 0) return [];

  // 3. Діапазони для нормалізації
  const prices = allHotels.map((h) => h.price || 0);
  const capacities = allHotels.map((h) => h.maxGuests || 0);
  const priceMin = Math.min(...prices);
  const priceMax = Math.max(...prices);
  const capMin = Math.min(...capacities);
  const capMax = Math.max(...capacities);

  // ── Cold-start: немає історії - повертаємо топ за рейтингом
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
      similarity_score: null, // немає персоналізації
      recommendation_reason: 'top_rated',
    }));
  }

  // 4. Завантажуємо лише ті готелі, які користувач бронював
  const bookedHotels = allHotels.filter((h) =>
    bookedHotelIds.includes(h._id.toString()),
  );

  // 5. Створюємо профіль користувача
  const userProfile = buildUserProfile(
    bookedHotels,
    userId,
    priceMin,
    priceMax,
    capMin,
    capMax,
  );

  if (!userProfile) return [];

  // 6. Обчислюємо косинусну подібність для кожного готелю, який ще не відвідували
  const candidates = allHotels.filter(
    (h) => !bookedHotelIds.includes(h._id.toString()),
  );

  const scored = candidates.map((hotel) => {
    const vec = buildHotelVector(hotel, priceMin, priceMax, capMin, capMax);
    const score = cosineSimilarity(userProfile, vec);
    return {
      ...hotel,
      similarity_score: parseFloat(score.toFixed(4)),
      recommendation_reason: 'personalized',
    };
  });

  // 7. Сортуємо за спаданням схожості та повертаємо topN
  scored.sort((a, b) => b.similarity_score - a.similarity_score);
  return scored.slice(0, topN);
};
