import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSessionCreate = vi.hoisted(() => vi.fn());
const mockConstructEvent = vi.hoisted(() => vi.fn());

vi.mock('../../utils/getEnvVar.js', () => ({
  getEnvVar: vi.fn((key, def) => {
    const map = {
      STRIPE_SECRET_KEY: 'sk_test_mock',
      STRIPE_WEBHOOK_SECRET: '',
      APP_DOMAIN: 'http://localhost:3000',
    };
    return map[key] ?? def ?? '';
  }),
}));

vi.mock('stripe', () => ({
  default: class MockStripe {
    constructor() {
      this.checkout = { sessions: { create: mockSessionCreate } };
      this.webhooks = { constructEvent: mockConstructEvent };
    }
  },
}));

vi.mock('../../db/models/hotel.js', () => ({
  HotelsCollection: { findById: vi.fn() },
}));

vi.mock('../../db/models/user.js', () => ({
  UsersCollection: { findById: vi.fn() },
}));

vi.mock('../../db/models/booking.js', () => ({
  BookingsCollection: {
    findOne: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    find: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

import { HotelsCollection } from '../../db/models/hotel.js';
import { UsersCollection } from '../../db/models/user.js';
import { BookingsCollection } from '../../db/models/booking.js';
import { createCheckoutSession, handleStripeWebhook } from '../../services/stripe.js';

const mockHotel = {
  _id: 'hid1',
  title: 'Grand Hotel',
  location: 'Kyiv',
  price: 100,
  imageUrl: null,
};

const mockUser = {
  _id: 'uid1',
  name: 'Alex',
  email: 'alex@test.com',
  phone: '',
};

const bookingData = {
  hotelId: 'hid1',
  checkIn: '2099-06-01',
  checkOut: '2099-06-05',
  guests: 2,
  name: 'Alex',
  email: 'alex@test.com',
  phone: '',
  specialRequests: '',
};

describe('createCheckoutSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HotelsCollection.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue(mockHotel),
    });
    UsersCollection.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue(mockUser),
    });
    BookingsCollection.findOne.mockResolvedValue(null);
    mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
  });

  it('повертає url Stripe checkout сесії', async () => {
    const result = await createCheckoutSession('uid1', bookingData);
    expect(result.url).toBe('https://checkout.stripe.com/test');
    expect(mockSessionCreate).toHaveBeenCalledOnce();
  });

  it('розраховує кількість ночей і суму в cents', async () => {
    await createCheckoutSession('uid1', bookingData);
    const call = mockSessionCreate.mock.calls[0][0];
    // 4 ночі * 100$ = 400$ = 40000 cents
    expect(call.line_items[0].price_data.unit_amount).toBe(40000);
  });

  it('кидає 404 якщо готель не знайдений', async () => {
    HotelsCollection.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });

    await expect(createCheckoutSession('uid1', bookingData)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('кидає 400 якщо checkOut раніше checkIn', async () => {
    await expect(
      createCheckoutSession('uid1', { ...bookingData, checkIn: '2099-06-10', checkOut: '2099-06-05' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('кидає 409 якщо дати вже зайняті', async () => {
    BookingsCollection.findOne.mockResolvedValueOnce({ _id: 'existing' });

    await expect(createCheckoutSession('uid1', bookingData)).rejects.toMatchObject({
      status: 409,
    });
  });
});

describe('handleStripeWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HotelsCollection.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue(mockHotel),
    });
    UsersCollection.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue(mockUser),
    });
    BookingsCollection.findOne.mockResolvedValue(null);
    BookingsCollection.create.mockResolvedValue({ _id: 'newbid' });
    BookingsCollection.updateMany.mockResolvedValue({});
  });

  it('обробляє checkout.session.completed і створює бронювання (dev mode без secret)', async () => {
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          metadata: {
            userId: 'uid1',
            hotelId: 'hid1',
            checkIn: '2099-06-01',
            checkOut: '2099-06-05',
            guests: '2',
            name: 'Alex',
            email: 'alex@test.com',
            phone: '',
            specialRequests: '',
          },
        },
      },
    };

    const rawBody = Buffer.from(JSON.stringify(event));
    const result = await handleStripeWebhook(rawBody, '');
    expect(result).toEqual({ received: true });
    expect(BookingsCollection.create).toHaveBeenCalledOnce();
  });

  it('ігнорує інші типи подій', async () => {
    const event = { type: 'payment_intent.created', data: { object: {} } };
    const rawBody = Buffer.from(JSON.stringify(event));
    const result = await handleStripeWebhook(rawBody, '');
    expect(result).toEqual({ received: true });
    expect(BookingsCollection.create).not.toHaveBeenCalled();
  });
});
