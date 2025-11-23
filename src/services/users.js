import createHttpError from 'http-errors';
import { UsersCollection } from '../db/models/user.js';

export const getUsersMeService = async (userId) => {
  const user = await UsersCollection.findById(userId);
  if (!user) {
    throw createHttpError(404, 'User not found');
  }
  return user;
};
