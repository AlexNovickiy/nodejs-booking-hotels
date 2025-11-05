import { isValidObjectId } from 'mongoose';
import createHttpError from 'http-errors';

export const isValidId = (idName) => (req, res, next) => {
  const id = req.params[idName];

  if (!id) {
    return next(
      createHttpError(400, `Bad Request: Missing parameter '${idName}'`),
    );
  }

  if (!isValidObjectId(id)) {
    return next(
      createHttpError(400, `Bad Request: '${id}' is not a valid ObjectId`),
    );
  }

  next();
};
