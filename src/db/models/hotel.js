import { model, Schema } from 'mongoose';

const reviewSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    user: {
      name: { type: String, required: true },
      photo: { type: String },
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true },
    date: { type: String, required: true },
    cleanliness_score: { type: Number, required: true, min: 1, max: 5 },
    location_score: { type: Number, required: true, min: 1, max: 5 },
  },
  { _id: true, timestamps: true, versionKey: false },
);

// Схема для отеля
const hotelSchema = new Schema(
  {
    title: { type: String, required: true },
    location: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    ratings_summary: {
      average_rating: { type: Number, default: 0 },
      cleanliness_score: { type: Number, default: 0 },
      location_score: { type: Number, default: 0 },
      total_reviews: { type: Number, default: 0 },
    },
    reviews: [reviewSchema], // Встраиваем отзывы
    maxGuests: { type: Number, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Индекс для поиска
hotelSchema.index({ title: 'text', location: 'text' });

export const HotelsCollection = model('hotels', hotelSchema);
