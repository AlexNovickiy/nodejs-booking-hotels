import Stripe from 'stripe';
import createHttpError from 'http-errors';
import { getEnvVar } from '../utils/getEnvVar.js';
import { HotelsCollection } from '../db/models/hotel.js';
import { UsersCollection } from '../db/models/user.js';
import { createBookingFromPayment, validateBookingAvailability } from './bookings.js';

const stripe = new Stripe(getEnvVar('STRIPE_SECRET_KEY'));

export const createCheckoutSession = async (userId, bookingData) => {
  const {
    hotelId,
    checkIn,
    checkOut,
    guests,
    name,
    email,
    phone,
    specialRequests,
  } = bookingData;

  const [hotel, user] = await Promise.all([
    HotelsCollection.findById(hotelId).select('title imageUrl location price'),
    UsersCollection.findById(userId).select('name email phone'),
  ]);

  if (!hotel) throw createHttpError(404, 'Hotel not found');
  if (!user) throw createHttpError(404, 'User not found');

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const nights = Math.ceil(
    (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24),
  );

  if (nights < 1)
    throw createHttpError(400, 'Invalid dates: check-out must be after check-in');

  const normalizedCheckIn = checkInDate.toISOString().split('T')[0];
  const normalizedCheckOut = checkOutDate.toISOString().split('T')[0];

  await validateBookingAvailability(userId, hotelId, normalizedCheckIn, normalizedCheckOut);

  const amountInCents = Math.round(hotel.price * nights * 100);
  const frontendDomain = getEnvVar('APP_DOMAIN', 'http://localhost:3000');

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'uah',
          product_data: {
            name: hotel.title,
            description: `${nights} night(s) · ${hotel.location} · ${guests} guest(s)`,
            images: hotel.imageUrl ? [hotel.imageUrl] : [],
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${frontendDomain}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendDomain}/${hotelId}?canceled=true`,
    customer_email: email || user.email,
    metadata: {
      userId: userId.toString(),
      hotelId: hotelId.toString(),
      checkIn: new Date(checkIn).toISOString().split('T')[0],
      checkOut: new Date(checkOut).toISOString().split('T')[0],
      guests: String(guests),
      name: name || user.name,
      email: email || user.email,
      phone: phone || user.phone || '',
      specialRequests: specialRequests || '',
    },
  });

  return { url: session.url };
};

export const handleStripeWebhook = async (rawBody, signature) => {
  const webhookSecret = getEnvVar('STRIPE_WEBHOOK_SECRET', '');

  let event;
  if (webhookSecret) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      throw createHttpError(
        400,
        `Webhook signature verification failed: ${err.message}`,
      );
    }
  } else {
    // Dev mode: no signature verification
    event = JSON.parse(rawBody.toString());
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const {
      userId,
      hotelId,
      checkIn,
      checkOut,
      guests,
      name,
      email,
      phone,
      specialRequests,
    } = session.metadata;

    await createBookingFromPayment({
      userId,
      hotelId,
      checkIn,
      checkOut,
      guests,
      name,
      email,
      phone,
      specialRequests,
      stripeSessionId: session.id,
    });
  }

  return { received: true };
};
