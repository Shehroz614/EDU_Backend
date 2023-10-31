import express, { Request, Response, NextFunction } from 'express';
import SupportService from '@services/support';
import isAuth from '@middlewares/isAuth';

const router = express.Router();

router.post('/report', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Support']
   */
  try {
    const userId = req?.userData?.uid as string;
    const { title, description, type, relatedItem } = req.body;
    const report = await SupportService.createReport({ userId, title, description, type, relatedItem });
    res.send(report);
  } catch (err) {
    next(err);
  }
});

export default router;
