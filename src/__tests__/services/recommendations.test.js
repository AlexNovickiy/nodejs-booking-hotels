import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/models/hotel.js', () => ({
  HotelsCollection: { find: vi.fn() },
}));

vi.mock('../../db/models/booking.js', () => ({
  BookingsCollection: { find: vi.fn() },
}));

import { HotelsCollection } from '../../db/models/hotel.js';
import { BookingsCollection } from '../../db/models/booking.js';
import { getRecommendations } from '../../services/recommendations.js';

const makeHotel = (id, price, rating, cleanliness, location, maxGuests) => ({
  _id: { toString: () => id },
  price,
  maxGuests,
  ratings_summary: {
    average_rating: rating,
    cleanliness_score: cleanliness,
    location_score: location,
  },
  reviews: [],
});

describe('getRecommendations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('повертає порожній масив якщо немає готелів', async () => {
    BookingsCollection.find.mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    HotelsCollection.find.mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });

    const result = await getRecommendations('uid1');
    expect(result).toEqual([]);
  });

  it('cold-start: повертає топ за рейтингом якщо немає бронювань', async () => {
    BookingsCollection.find.mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });

    const hotels = [
      makeHotel('h1', 100, 4.5, 4, 4, 2),
      makeHotel('h2', 200, 3.0, 3, 3, 4),
      makeHotel('h3', 150, 5.0, 5, 5, 3),
    ];
    HotelsCollection.find.mockReturnValue({ lean: vi.fn().mockResolvedValue(hotels) });

    const result = await getRecommendations('uid1', 2);

    expect(result).toHaveLength(2);
    expect(result[0].ratings_summary.average_rating).toBe(5.0);
    expect(result.every(h => h.recommendation_reason === 'top_rated')).toBe(true);
  });

  it('персоналізовані рекомендації: не включає вже заброньовані готелі', async () => {
    const bookedHotelId = 'h1';
    BookingsCollection.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { hotelId: { toString: () => bookedHotelId } },
      ]),
    });

    const hotels = [
      makeHotel('h1', 100, 4.0, 4, 4, 2),
      makeHotel('h2', 120, 4.2, 4.2, 4.1, 2),
      makeHotel('h3', 90,  3.5, 3.5, 3.5, 2),
    ];
    HotelsCollection.find.mockReturnValue({ lean: vi.fn().mockResolvedValue(hotels) });

    const result = await getRecommendations('uid1', 5);

    const ids = result.map(h => h._id.toString());
    expect(ids).not.toContain(bookedHotelId);
    expect(result.every(h => h.recommendation_reason === 'personalized')).toBe(true);
  });

  it('повертає порожній масив якщо всі готелі вже заброньовані', async () => {
    BookingsCollection.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ hotelId: { toString: () => 'h1' } }]),
    });

    const hotels = [makeHotel('h1', 100, 4.0, 4, 4, 2)];
    HotelsCollection.find.mockReturnValue({ lean: vi.fn().mockResolvedValue(hotels) });

    const result = await getRecommendations('uid1');
    expect(result).toEqual([]);
  });

  it('враховує рейтинг юзера як вагу при побудові профілю', async () => {
    BookingsCollection.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ hotelId: { toString: () => 'h1' } }]),
    });

    const hotels = [
      makeHotel('h1', 100, 5.0, 5, 5, 2),
      makeHotel('h2', 100, 5.0, 5, 5, 2),
    ];
    // Додаємо відгук юзера до h1
    hotels[0].reviews = [{ userId: { toString: () => 'uid1' }, rating: 5 }];
    HotelsCollection.find.mockReturnValue({ lean: vi.fn().mockResolvedValue(hotels) });

    const result = await getRecommendations('uid1', 1);
    expect(result).toHaveLength(1);
    expect(result[0]._id.toString()).toBe('h2');
  });
});
