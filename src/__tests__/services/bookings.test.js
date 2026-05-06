import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/models/booking.js', () => ({
  BookingsCollection: {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock('../../db/models/hotel.js', () => ({
  HotelsCollection: {
    findById: vi.fn(),
  },
}));

vi.mock('../../db/models/user.js', () => ({
  UsersCollection: {
    findById: vi.fn(),
  },
}));

import { BookingsCollection } from '../../db/models/booking.js';
import { HotelsCollection } from '../../db/models/hotel.js';
import { UsersCollection } from '../../db/models/user.js';
import {
  validateBookingAvailability,
  getUserBookings,
  getUserHotelBooking,
  deleteUserBooking,
} from '../../services/bookings.js';

const TODAY = new Date().toISOString().split('T')[0];
const FUTURE = '2099-12-31';
const PAST = '2000-01-01';

describe('validateBookingAvailability', () => {
  beforeEach(() => vi.clearAllMocks());

  it('не кидає помилку якщо дати вільні', async () => {
    BookingsCollection.findOne.mockResolvedValue(null);
    await expect(
      validateBookingAvailability('uid1', 'hid1', TODAY, FUTURE),
    ).resolves.toBeUndefined();
  });

  it('кидає 409 якщо юзер вже має активну броню на цей готель', async () => {
    BookingsCollection.findOne.mockResolvedValueOnce({ _id: 'bid1' });
    await expect(
      validateBookingAvailability('uid1', 'hid1', TODAY, FUTURE),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('кидає 409 якщо дати перетинаються з чужою бронею', async () => {
    BookingsCollection.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: 'bid2' });
    await expect(
      validateBookingAvailability('uid1', 'hid1', TODAY, FUTURE),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('НЕ блокує якщо стара броня прострочена (checkOut < today)', async () => {
    // findOne для перевірки юзера з фільтром checkOut >= today повертає null
    BookingsCollection.findOne.mockResolvedValue(null);
    await expect(
      validateBookingAvailability('uid1', 'hid1', TODAY, FUTURE),
    ).resolves.toBeUndefined();
  });
});

describe('getUserBookings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('оновлює прострочені бронювання і повертає список', async () => {
    const mockBookings = [{ _id: 'b1', status: 'confirmed' }];
    BookingsCollection.updateMany.mockResolvedValue({});
    BookingsCollection.find.mockReturnValue({ sort: vi.fn().mockResolvedValue(mockBookings) });

    const result = await getUserBookings('uid1');

    expect(BookingsCollection.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'confirmed' }),
      { $set: { status: 'completed' } },
    );
    expect(result).toEqual(mockBookings);
  });
});

describe('getUserHotelBooking', () => {
  beforeEach(() => vi.clearAllMocks());

  it('повертає активну броню якщо є', async () => {
    const mockBooking = { _id: 'b1', status: 'confirmed', checkOut: FUTURE };
    BookingsCollection.findOne.mockResolvedValue(mockBooking);

    const result = await getUserHotelBooking('uid1', 'hid1');
    expect(result).toEqual(mockBooking);
  });

  it('повертає null якщо активної брони немає', async () => {
    BookingsCollection.findOne.mockResolvedValue(null);
    const result = await getUserHotelBooking('uid1', 'hid1');
    expect(result).toBeNull();
  });

  it('запит включає фільтр checkOut >= today', async () => {
    BookingsCollection.findOne.mockResolvedValue(null);
    await getUserHotelBooking('uid1', 'hid1');

    expect(BookingsCollection.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        checkOut: { $gte: TODAY },
      }),
    );
  });
});

describe('deleteUserBooking', () => {
  beforeEach(() => vi.clearAllMocks());

  it('видаляє бронювання зі статусом completed', async () => {
    BookingsCollection.findOne.mockResolvedValue({ _id: 'b1', status: 'completed' });
    BookingsCollection.deleteOne.mockResolvedValue({});

    await expect(deleteUserBooking('uid1', 'b1')).resolves.toBeUndefined();
    expect(BookingsCollection.deleteOne).toHaveBeenCalledWith({ _id: 'b1' });
  });

  it('видаляє бронювання зі статусом cancelled', async () => {
    BookingsCollection.findOne.mockResolvedValue({ _id: 'b1', status: 'cancelled' });
    BookingsCollection.deleteOne.mockResolvedValue({});

    await expect(deleteUserBooking('uid1', 'b1')).resolves.toBeUndefined();
  });

  it('кидає 404 якщо броня не знайдена', async () => {
    BookingsCollection.findOne.mockResolvedValue(null);

    await expect(deleteUserBooking('uid1', 'nonexistent')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('кидає 403 якщо статус confirmed', async () => {
    BookingsCollection.findOne.mockResolvedValue({ _id: 'b1', status: 'confirmed' });

    await expect(deleteUserBooking('uid1', 'b1')).rejects.toMatchObject({
      status: 403,
    });
    expect(BookingsCollection.deleteOne).not.toHaveBeenCalled();
  });
});
