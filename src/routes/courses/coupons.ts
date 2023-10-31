import express, { Request, Response, NextFunction } from 'express';
import isAuth from '@middlewares/isAuth';
import CoursesService from '@services/courses';

const router = express.Router();

/**
 * Get course coupons
 * @since v1.0
 */
router.get(
  '/courses/:courseId/:courseVersion/coupons',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req.userData?.uid as string;
      const { courseId, courseVersion: version } = req.params;
      const course = await CoursesService.getCourseVersion(courseId, version, userId, {
        populate: [{ path: 'versions.$*.coupons' }],
        lean: true,
      });
      res.json(course?.coupons);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Add course coupons
 * @since v1.0
 */
router.put(
  '/courses/:courseId/:courseVersion/coupons',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req.userData?.uid as string;
      const { courseId, courseVersion: version } = req.params;
      const { coupon } = req.body;
      const course = await CoursesService.updateCoupons(courseId, version, coupon, userId);
      res.json(course?.coupons);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Delete course coupon
 * @since v1.0
 */
router.delete(
  '/courses/:courseId/:courseVersion/coupons/:couponId',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req.userData?.uid as string;
      const { courseId, couponId, courseVersion: version } = req.params;

      const course = await CoursesService.deleteCoupons(courseId, version, couponId, userId);
      res.json(course?.coupons);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
