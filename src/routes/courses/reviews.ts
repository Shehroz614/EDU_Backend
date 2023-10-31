import express, { Request, Response, NextFunction } from 'express';
import isAuth from '@middlewares/isAuth';
import HTTPError from '@errors/HTTPError';
import CoursesService from '@services/courses';

const router = express.Router();

/**
 * Get course reviews
 * @since 1.0
 */
router.get('/courses/:courseId/reviews', async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Courses']
   */
  try {
    const { courseId } = req.params;
    if (!courseId) {
      next(new HTTPError(400, 'Course ID is required'));
      return;
    }

    const reviews = await CoursesService.getReviews(courseId);
    res.send(reviews);
  } catch (err) {
    next(err);
  }
});

/**
 * Add course review
 * @since 1.0
 */
router.post('/courses/:courseId/reviews', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Courses']
   */
  try {
    const { courseId } = req.params;
    const userId = req?.userData?.uid as string;
    const { title, review, rating } = req.body;

    if (!courseId) {
      next(new HTTPError(400, 'Course ID is required'));
      return;
    }

    const response = await CoursesService.addReview({ courseId, userId, title, review, rating });
    res.send(response);
  } catch (err) {
    next(err);
  }
});

/**
 * Edit Course Review
 * @since 1.0
 */
router.patch(
  '/courses/:courseId/reviews/:reviewId',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const { courseId } = req.params;
      const userId = req?.userData?.uid as string;
      const { title, review, rating } = req.body;

      if (!courseId) {
        next(new HTTPError(400, 'Course ID is required'));
        return;
      }

      const response = await CoursesService.updateReview({ courseId, userId, title, review, rating });
      res.send(response);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Delete course review
 * @since 1.0
 */
router.delete(
  '/courses/:courseId/reviews/:reviewId',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const { courseId, reviewId } = req.params;
      const userId = req?.userData?.uid as string;

      await CoursesService.deleteReview({ courseId, reviewId, userId });
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Add Review Like
 * @since 1.0
 */
router.post(
  '/courses/:courseId/reviews/:reviewId/like',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const { courseId, reviewId } = req.params;
      const userId = req?.userData?.uid as string;

      await CoursesService.addReviewLike({ courseId, userId, reviewId });
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Remove Review Like
 * @since 1.0
 */
router.delete(
  '/courses/:courseId/reviews/:reviewId/like',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const { courseId, reviewId } = req.params;
      const userId = req?.userData?.uid as string;

      await CoursesService.removeReviewDislike({ courseId, userId, reviewId });
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Add Review Dislike
 * @since 1.0
 */
router.post(
  '/courses/:courseId/reviews/:reviewId/dislike',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const { courseId, reviewId } = req.params;
      const userId = req?.userData?.uid as string;

      await CoursesService.addReviewDislike({ courseId, userId, reviewId });
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Remove Review Dislike
 * @since 1.0
 */
router.delete(
  '/courses/:courseId/reviews/:reviewId/dislike',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const { courseId, reviewId } = req.params;
      const userId = req?.userData?.uid as string;

      await CoursesService.removeReviewLike({ courseId, userId, reviewId });
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Add review response
 * @since 1.0
 */
router.post(
  '/courses/:courseId/reviews/:reviewId/responses',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const { courseId, reviewId } = req.params;
      const userId = req?.userData?.uid as string;
      const { comment } = req.body;

      const review = await CoursesService.addReviewComment({ courseId, reviewId, userId, comment });
      res.send(review);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Delete review response
 * @since 1.0
 */
router.delete(
  '/courses/:courseId/reviews/:reviewId/responses/:responseId',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const { courseId, reviewId, responseId } = req.params;
      const userId = req?.userData?.uid as string;

      const review = await CoursesService.removeReviewComment({ courseId, reviewId, userId, responseId });
      res.send(review);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
