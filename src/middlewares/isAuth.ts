import admin from 'firebase-admin';
import { Request, Response, NextFunction } from 'express';
import HTTPError from '@errors/HTTPError';

const isAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req?.headers?.authorization?.split(' ')[1] as string;
    req.userData = (await admin.auth().verifyIdToken(token)) as { uid: string; email: string };
    return next();
  } catch (error) {
    return next(new HTTPError(401, 'Authentication Required'));
  }
};

export default isAuth;
