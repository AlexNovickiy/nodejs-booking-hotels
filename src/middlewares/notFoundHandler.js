import createHttpError from 'http-errors';

export const notFoundHandler = (req, res, next) => {
  const err = createHttpError(404, 'Route not found');
  res.status(err.status).json({
    status: err.status,
    message: err.name,
    data: err,
  });
};
