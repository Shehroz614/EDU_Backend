import express, { NextFunction, Request, Response } from 'express';
import isAuth from '@middlewares/isAuth';
import CoursesService from '@services/courses';
import ReviewRecordsService from '@services/review_records';

const router = express.Router();

/**
 * Publish course version
 * @since v1.0
 */
router.post(
  '/courses/:courseId/:courseVersion/publish',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId, courseVersion: versionNumber } = req.params;
      const { reviewNote, contactEmail } = req.body;

      const response = await CoursesService.publish({
        courseId,
        versionNumber,
        userId,
        reviewNote,
        contactEmail,
      });
      res.json(response);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Release course version
 * @deprecated
 * @since v1.0
 */
router.post(
  '/courses/:courseId/:courseVersion/release',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const { courseId, courseVersion: versionNumber } = req.params;
      const userId = req?.userData?.uid as string;
      const response = await CoursesService.releaseCourse({
        courseId,
        versionNumber,
        userId,
      });
      res.json(response);
    } catch (err) {
      next(err);
    }
  },
);
/**
 * Reject course version
 * @deprecated
 * @since v1.0
 */
router.post(
  '/courses/:courseId/:courseVersion/reject',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const { courseId, courseVersion: versionNumber } = req.params;
      const userId = req?.userData?.uid as string;
      const response = await CoursesService.rejectCourse({
        courseId,
        versionNumber,
        userId,
      });
      res.json(response);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Get course's last review record
 * @since v1.0
 */
router.get('/courses/:courseId/review-record', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Courses']
   */
  try {
    const { courseId } = req.params;
    const userId = req?.userData?.uid as string;
    const response = await ReviewRecordsService.getPendingRecord({ courseId, userId }, true);
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * Get course's review records
 * @since v1.0
 */
router.get('/courses/:courseId/review-records', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Courses']
   */
  try {
    const { courseId } = req.params;
    const userId = req?.userData?.uid as string;

    const response = await ReviewRecordsService.getRecords({ course: courseId }, { userId });
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * Get course's review record for specific version
 * @since v1.0
 */
router.get(
  '/courses/:courseId/:courseVersion/review-record',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const { courseId, courseVersion } = req.params;
      const userId = req?.userData?.uid as string;

      const response = await ReviewRecordsService.getPendingRecord(
        { courseId, userId, versionNumber: courseVersion },
        true,
      );
      res.json(response || null);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Cancel course's review
 * @since 1.0
 */
router.delete(
  '/courses/:courseId/:courseVersion/review-record',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const { courseId, courseVersion: versionNumber } = req.params;
      const userId = req?.userData?.uid as string;

      const response = await CoursesService.cancelReview({ courseId, versionNumber, userId });
      res.send(response);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
