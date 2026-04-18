import {
  getAllHotels,
  getUserHotels,
  getHotelById,
  createHotel,
  updateHotel,
  deleteHotel,
  createReview,
  getAllClassifications,
} from '../services/hotels.js';
import createHttpError from 'http-errors';
import { parsePaginationParams } from '../utils/parsePaginationParams.js';
import { parseSortParams } from '../utils/parseSortParams.js';
import { parseFilterParams } from '../utils/parseFilterParams.js';
import { saveFileToUploadDir } from '../utils/saveFileToUploadDir.js';
import { getEnvVar } from '../utils/getEnvVar.js';
import { saveFileToCloudinary } from '../utils/saveFileToCloudinary.js';

// GET /hotels
export const getHotelsController = async (req, res) => {
  const { page, perPage } = parsePaginationParams(req.query);
  const { sortBy, sortOrder } = parseSortParams(req.query);
  const filter = parseFilterParams(req.query); // Использует наш обновленный parseFilterParams

  const data = await getAllHotels({
    page,
    perPage,
    sortBy,
    sortOrder,
    filter,
  });

  res.status(200).json({
    status: 200,
    message: 'Successfully found hotels!',
    data,
  });
};

// GET /hotels/my-listings
export const getMyListingsController = async (req, res) => {
  const userId = req.user._id;
  const data = await getUserHotels(userId);
  res.status(200).json({
    status: 200,
    message: 'Successfully found user listings!',
    data,
  });
};

// GET /hotels/classification
export const getClassificationController = async (req, res) => {
  const data = await getAllClassifications();
  res.status(200).json({
    status: 200,
    message: 'Successfully fetched classifications!',
    data,
  });
};

// GET /hotels/:hotelId
export const getHotelByIdController = async (req, res, next) => {
  const { hotelId } = req.params;
  const data = await getHotelById(hotelId);

  if (!data) {
    throw createHttpError(404, `Hotel with id ${hotelId} not found`);
  }

  res.status(200).json({
    status: 200,
    message: `Successfully found hotel with id ${hotelId}!`,
    data,
  });
};

// POST /hotels
export const createHotelController = async (req, res) => {
  const userId = req.user._id;
  const photo = req.file;

  if (!photo) {
    throw createHttpError(400, 'Image file is required');
  }

  let photoUrl;
  if (getEnvVar('ENABLE_CLOUDINARY') === 'true') {
    photoUrl = await saveFileToCloudinary(photo);
  } else {
    photoUrl = await saveFileToUploadDir(photo);
  }

  const data = await createHotel({
    ...req.body,
    imageUrl: photoUrl,
    ownerId: userId,
  });

  res.status(201).json({
    status: 201,
    message: 'Successfully created a hotel!',
    data,
  });
};

// PATCH /hotels/:hotelId
export const updateHotelController = async (req, res, next) => {
  const { hotelId } = req.params;
  const userId = req.user._id;
  const photo = req.file;

  let photoUrl;
  if (photo) {
    if (getEnvVar('ENABLE_CLOUDINARY') === 'true') {
      photoUrl = await saveFileToCloudinary(photo);
    } else {
      photoUrl = await saveFileToUploadDir(photo);
    }
  }

  const payload = photo ? { ...req.body, imageUrl: photoUrl } : req.body;

  const data = await updateHotel(hotelId, userId, payload);

  res.status(201).json({
    status: 201,
    message: 'Successfully updated a hotel!',
    data,
  });
};

// DELETE /hotels/:hotelId
export const deleteHotelController = async (req, res, next) => {
  const { hotelId } = req.params;
  const userId = req.user._id;

  await deleteHotel(hotelId, userId);

  res.status(204).send();
};

// POST /hotels/:hotelId/reviews
export const createReviewController = async (req, res, next) => {
  const { hotelId } = req.params;
  const userId = req.user._id;

  const data = await createReview(hotelId, userId, req.body);

  res.status(201).json({
    status: 201,
    message: 'Successfully created a review!',
    data,
  });
};
