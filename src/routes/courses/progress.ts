import express, { NextFunction, Request, Response } from 'express';
import isAuth from '@middlewares/isAuth';
import HTTPError from '@errors/HTTPError';
import CoursesService from '@services/courses';

const router = express.Router();

/**
 * Get course progress
 * @since v1.0
 */
router.get('/courses/:courseId/progress', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Courses']
   */
  try {
    const { courseId } = req.params;
    const userId = req?.userData?.uid as string;
    if (!courseId) {
      next(new HTTPError(400, 'Course ID is required'));
      return;
    }

    const courseProgress = await CoursesService.getProgress({ userId, courseId });
    res.json(courseProgress);
  } catch (err) {
    next(err);
  }
});

/**
 * Update course progress
 * @since v1.0
 */
router.put('/courses/:courseId/progress', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Courses']
   */
  try {
    const { courseId } = req.params;
    const userId = req?.userData?.uid as string;
    const { lastLectureId } = req.body;

    if (!courseId) {
      next(new HTTPError(400, 'Course ID is required'));
      return;
    }
    if (!lastLectureId) {
      next(new HTTPError(400, 'Empty progress data'));
      return;
    }

    const courseProgressResponse = await CoursesService.updateProgress({ userId, courseId, lastLectureId });
    res.json(courseProgressResponse);
  } catch (err) {
    next(err);
  }
});

/**
 * Update course lecture progress
 * @since v1.0
 */
router.put('/courses/:courseId/lecture-progress', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Courses']
   */
  try {
    const { courseId } = req.params;
    const userId = req?.userData?.uid as string;

    const lectureProgress = req.body.lecture_progress || {};
    if (!courseId) {
      next(new HTTPError(400, 'Course ID is required'));
      return;
    }

    const courseProgress = await CoursesService.updateLectureProgress({ userId, courseId, lectureProgress });
    res.json(courseProgress);
  } catch (err) {
    next(err);
  }
});

export default router;
