import {
  createBooking,
  getUserBookings,
  getHotelBookings,
} from '../services/bookings.js';

// POST /bookings
export const createBookingController = async (req, res) => {
  const userId = req.user._id;
  const data = await createBooking(userId, req.body);

  res.status(201).json({
    status: 201,
    message: 'Successfully created a booking!',
    data,
  });
};

// GET /bookings/my-bookings
export const getMyBookingsController = async (req, res) => {
  const userId = req.user._id;
  const data = await getUserBookings(userId);

  res.status(200).json({
    status: 200,
    message: 'Successfully found user bookings!',
    data,
  });
};

// GET /bookings/hotel/:hotelId
export const getHotelBookingsController = async (req, res) => {
  const { hotelId } = req.params;
  const data = await getHotelBookings(hotelId);

  res.status(200).json({
    status: 200,
    message: 'Successfully found hotel bookings!',
    data,
  });
};
