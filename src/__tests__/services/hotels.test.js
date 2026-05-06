import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/models/hotel.js', () => ({
  HotelsCollection: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../../db/models/user.js', () => ({
  UsersCollection: { findById: vi.fn() },
}));

vi.mock('../../utils/calculatePaginationData.js', () => ({
  calculatePaginationData: vi.fn().mockReturnValue({
    page: 1, perPage: 10, totalItems: 1, totalPages: 1,
    hasNextPage: false, hasPreviousPage: false,
  }),
}));

import { HotelsCollection } from '../../db/models/hotel.js';
import { UsersCollection } from '../../db/models/user.js';
import {
  getAllHotels,
  getHotelById,
  createHotel,
  updateHotel,
  deleteHotel,
} from '../../services/hotels.js';

const mockHotel = {
  _id: 'hid1',
  title: 'Grand Hotel',
  location: 'Kyiv',
  price: 100,
  ownerId: 'uid1',
};

const makeChain = (result) => ({
  merge: vi.fn().mockReturnThis(),
  countDocuments: vi.fn().mockResolvedValue(1),
  skip: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  sort: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(result),
});

describe('getAllHotels', () => {
  beforeEach(() => vi.clearAllMocks());

  it('повертає готелі з пагінацією', async () => {
    const chain = makeChain([mockHotel]);
    HotelsCollection.find.mockReturnValue(chain);

    const result = await getAllHotels({ page: 1, perPage: 10, filter: {} });

    expect(result.hotels).toEqual([mockHotel]);
    expect(result.totalItems).toBe(1);
  });
});

describe('getHotelById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('повертає готель за ID', async () => {
    HotelsCollection.findById.mockResolvedValue(mockHotel);
    const result = await getHotelById('hid1');
    expect(result).toEqual(mockHotel);
  });

  it('повертає null якщо не знайдено', async () => {
    HotelsCollection.findById.mockResolvedValue(null);
    const result = await getHotelById('nonexistent');
    expect(result).toBeNull();
  });
});

describe('createHotel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('створює новий готель', async () => {
    HotelsCollection.create.mockResolvedValue(mockHotel);
    const result = await createHotel({ title: 'Grand Hotel', price: 100 });
    expect(result).toEqual(mockHotel);
  });
});

describe('updateHotel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('оновлює готель власника', async () => {
    const updated = { ...mockHotel, price: 200 };
    HotelsCollection.findOne.mockResolvedValue(mockHotel);
    HotelsCollection.findOneAndUpdate.mockResolvedValue(updated);

    const result = await updateHotel('hid1', 'uid1', { price: 200 });
    expect(result.price).toBe(200);
  });

  it('кидає 404 якщо готель не знайдений', async () => {
    HotelsCollection.findOne.mockResolvedValue(null);

    await expect(updateHotel('hid_bad', 'uid1', {})).rejects.toMatchObject({
      status: 404,
    });
  });

  it('кидає 403 якщо юзер не є власником', async () => {
    HotelsCollection.findOne.mockResolvedValue(mockHotel);

    await expect(updateHotel('hid1', 'other_uid', {})).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe('deleteHotel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('видаляє готель власника', async () => {
    HotelsCollection.findOne.mockResolvedValue(mockHotel);
    HotelsCollection.findOneAndDelete.mockResolvedValue(mockHotel);

    const result = await deleteHotel('hid1', 'uid1');
    expect(result).toEqual(mockHotel);
  });

  it('кидає 404 якщо готель не знайдений', async () => {
    HotelsCollection.findOne.mockResolvedValue(null);

    await expect(deleteHotel('hid_bad', 'uid1')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('кидає 403 якщо юзер не є власником', async () => {
    HotelsCollection.findOne.mockResolvedValue(mockHotel);

    await expect(deleteHotel('hid1', 'other_uid')).rejects.toMatchObject({
      status: 403,
    });
  });
});
