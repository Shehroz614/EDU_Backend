import express, { Request, Response, NextFunction } from 'express';
import SearchService from '@services/search';
import models from '@models/index';
import admin from 'firebase-admin';
import { isEmpty } from '@middlewares/miniLodash';
import Oracle from '@services/oracle';
import oracle from '@services/oracle';

const router = express.Router();

router.get('/courses/suggestions', async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Search']
   */
  try {
    console.log('test', !isEmpty(req?.headers?.authorization?.split(' ')[1]));
    if (!isEmpty(req?.headers?.authorization?.split(' ')[1])) {
      const token = req?.headers?.authorization?.split(' ')[1] as string;
      req.userData = (await admin.auth().verifyIdToken(token)) as { uid: string; email: string };
    }
    const { search } = req.query;
    let results: any[] = [];

    results = await SearchService.getCourseSuggestions(search as string, req?.userData?.uid || '');

    res.send(results);
  } catch (err) {
    next(err);
  }
});

router.post('/courses/addSearchQuery', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isEmpty(req?.headers?.authorization?.split(' ')[1])) {
      const token = req?.headers?.authorization?.split(' ')[1] as string;
      req.userData = (await admin.auth().verifyIdToken(token)) as { uid: string; email: string };
    }
    const currentUserId = (req?.userData?.uid as string) || '';
    const search = req.body.search as string;

    // console.log('user data', req?.userData);

    // models.SearchQuery.create({text: search, userId: currentUserId});

    SearchService.addSearchQueryWithValidation(search, currentUserId);

    res.send('Search Query was saved');
  } catch (err) {
    next(err);
  }
});

router.get('/test', async (req, res, next) => {
  try {
    const mediaFlows = await oracle.listMediaFlows();
    // eslint-disable-next-line no-restricted-syntax
    for (const mediaFlowsConfig of Oracle.mediaFlowsConfigs) {
      if (!mediaFlows.some((m) => m.displayName === mediaFlowsConfig.displayName)) {
        await Oracle.createMediaFlow(mediaFlowsConfig);
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    next(err);
  }
});

export default router;
