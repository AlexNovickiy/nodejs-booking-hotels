import { getRecommendations } from '../services/recommendations.js';

export const getRecommendationsController = async (req, res) => {
  const userId = req.user._id;
  const topN = parseInt(req.query.topN, 10) || 5;

  const data = await getRecommendations(userId, topN);

  res.status(200).json({
    status: 200,
    message: 'Successfully fetched recommendations!',
    data,
  });
};
