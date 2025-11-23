import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { getUsersMeController } from '../controllers/users.js';
import { ctrlWrapper } from '../utils/ctrlWrapper.js';

const usersRouter = Router();

usersRouter.get('/me', authenticate, ctrlWrapper(getUsersMeController));

export default usersRouter;
