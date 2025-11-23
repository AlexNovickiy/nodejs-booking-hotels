import { getUsersMeService } from '../services/users.js';

export const getUsersMeController = async (req, res) => {
  const user = await getUsersMeService(req.user._id);

  res.status(200).json({
    status: 200,
    message: 'Successfully fetched user profile!',
    data: user,
  });
};
