import { Router } from 'express';
import { ctrlWrapper } from '../utils/ctrlWrapper.js';
import { authenticate } from '../middlewares/authenticate.js';
import { getRecommendationsController } from '../controllers/recommendations.js';

const recommendationsRouter = Router();

// GET /recommendations?topN=5
recommendationsRouter.get('/', authenticate, ctrlWrapper(getRecommendationsController));

export default recommendationsRouter;
