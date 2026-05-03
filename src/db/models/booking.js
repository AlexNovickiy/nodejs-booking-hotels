import { model, Schema } from 'mongoose';

const bookingSchema = new Schema(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'hotels', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    checkIn: { type: String, required: true },
    checkOut: { type: String, required: true },
    guests: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'confirmed',
    },
    specialRequests: { type: String },
    stripeSessionId: { type: String },
    // Денормализованные данные для быстрого отображения в "Мои Бронирования"
    user: {
      _id: { type: String, required: true },
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String },
    },
    hotel: {
      _id: { type: String, required: true },
      title: { type: String, required: true },
      imageUrl: { type: String },
      location: { type: String, required: true },
      price: { type: Number, required: true },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const BookingsCollection = model('bookings', bookingSchema);
