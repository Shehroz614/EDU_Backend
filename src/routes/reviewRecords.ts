import express, { Request, Response, NextFunction } from 'express';
import ReviewRecordsService from '@services/review_records';
import CoursesService from '@services/courses';
import isAuth from '@middlewares/isAuth';
import HTTPError from '@errors/HTTPError';

const router = express.Router();

/**
 * Get all review records
 * @since v1.0
 */
router.get('/', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Review Records']
   */
  try {
    // get all
  } catch (err) {
    next(err);
  }
});
/**
 * Get review record || Get all active review records
 * @since v1.0
 */
router.get('/:reviewRecordId', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Review Records']
   */
  try {
    const { reviewRecordId } = req.params;
    if (!reviewRecordId) {
      next(new HTTPError(400, 'Review-record ID is required'));
      return;
    }
    const response =
      reviewRecordId === 'active'
        ? await ReviewRecordsService.getActiveRecords()
        : await ReviewRecordsService.findOne({ _id: reviewRecordId });
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * Start review for review record
 * @since v1.0
 */
router.post('/:reviewRecordId/start-review', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Review Records']
   */
  try {
    const { adminId } = req.body;
    const { reviewRecordId } = req.params;
    if (!reviewRecordId) {
      next(new HTTPError(400, 'Review-record ID is required'));
      return;
    }
    await ReviewRecordsService.startReview({ reviewRecordId, adminId });
    res.status(200);
  } catch (err) {
    next(err);
  }
});

/**
 * Approve review record
 * @since v1.0
 */
router.post('/:reviewRecordId/approve', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Review Records']
   */
  try {
    const { adminId } = req.body;
    const { reviewRecordId } = req.params;
    if (!reviewRecordId) {
      next(new HTTPError(400, 'Review-record ID is required'));
      return;
    }
    const response = await ReviewRecordsService.approve({ reviewRecordId, adminId });
    await CoursesService.releaseCourse({
      courseId: response.course,
      versionNumber: response.version.toString(),
      userId: response.authorId,
    });
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * Reject review record
 * @since v1.0
 */
router.post('/:reviewRecordId/reject', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Review Records']
   */
  try {
    const { reviewRecordId } = req.params;
    const { rejectionReason, adminId } = req.body;
    const response = await ReviewRecordsService.reject({
      reviewRecordId,
      rejectionReason,
      adminId,
    });
    // TODO - Send Notification to author;
    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
