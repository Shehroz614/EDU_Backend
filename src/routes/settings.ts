import express, { Request, Response, NextFunction } from 'express';
import HTTPError from '@errors/HTTPError';
import isAuth from '@middlewares/isAuth';
import { isEmpty } from '@middlewares/miniLodash';
import admin from 'firebase-admin';
import SettingsService from '../services/settings';

const router = express.Router();

/**
 * Get setting by name
 * @since v1.0
 */
router.get('/:settingName', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { settingName } = req.params;
    let userId = null;
    if (!isEmpty(req?.headers?.authorization?.split(' ')[1])) {
      const token = req?.headers?.authorization?.split(' ')[1] as string;
      userId = (await admin.auth().verifyIdToken(token)).uid;
    }

    if (!settingName) {
      next(new HTTPError(400, 'Setting Name is required'));
      return;
    }
    const setting = await SettingsService.getSetting(settingName, userId);
    res.send(setting);
  } catch (err) {
    next(err);
  }
});

export default router;
