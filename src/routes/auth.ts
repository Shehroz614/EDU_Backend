import express, { Request, Response, NextFunction } from 'express';
import AuthService from '@services/auth';
import isAuth from '@middlewares/isAuth';
import HTTPError from '@errors/HTTPError';

const router = express.Router();

/**
 * Register
 * @since v1.0
 */
router.post('/register', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Authentication']
   */
  try {
    const userRecord = req.userData as { uid: string; email: string };
    const { userData } = req.body;
    const user = await AuthService.register(userRecord, userData);
    res.json(user);
    // need to send email with verification link for confirm email address...
    // sendEmailVerification(userRecord.email, userRecord.displayName);
  } catch (err) {
    next(err);
  }
});

/**
 * Login
 * @since v1.0
 */
router.post('/login', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Authentication']
   */
  try {
    const userId = req?.userData?.uid as string;
    const user = await AuthService.login(userId);
    if (!user) {
      next(new HTTPError(404, 'User not found!'));
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
