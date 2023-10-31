import express, { NextFunction, Request, Response } from 'express';
import isAuth from '@middlewares/isAuth';
import CoursesService from '@services/courses';
import HTTPError from '@errors/HTTPError';
import UserService from '@services/user';

const router = express.Router();

/**
 * Get Array of courses
 * @since v1.0
 */
router.get('/courses', async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Courses']
   */
  try {
    const search = req.query.search as string;
    const filters = req.query.filters as string;
    const sort = req.query.sort as string;
    const limit = parseInt(req.query?.limit as string, 10) || 100;
    const page = parseInt(req.query?.page as string, 10) || 0;

    const { courses, totalCount } = await CoursesService.getCourses(search, filters, sort, limit, page);

    res
      .header({
        'Access-Control-Expose-Headers': 'X-Total',
        'X-Total': totalCount,
        'X-Page': page,
        'X-Limit': limit,
      })
      .json(courses);
  } catch (err) {
    next(err);
  }
});

/**
 * Create new course with blank draft version
 * @since V1.0
 */
router.post('/courses', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Courses']
   */
  try {
    const currentUserId = req?.userData?.uid as string;
    // create empty course
    const course = await CoursesService.create(currentUserId);
    if (!course) {
      next(new HTTPError(404, 'Course not found'));
      return;
    }
    // we add course to user`s courses
    await UserService.addToCourses({
      courseId: course._id,
      userId: currentUserId,
      type: 'my_courses',
    });
    res.json(course);
  } catch (err) {
    next(err);
  }
});

/**
 * Get Course filters
 * @since v1.0
 */
router.get('/courses/filters', async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Courses']
   */
  try {
    const courseFilters = await CoursesService.getFilters();
    res.send(courseFilters);
  } catch (err) {
    next(err);
  }
});

/**
 * Get entire course object
 * @since v1.0
 */
router.get('/courses/:courseId', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Courses']
   */
  try {
    const userId = req?.userData?.uid as string;
    const { courseId } = req.params;
    if (!courseId) {
      next(new HTTPError(400, 'Course ID is required'));
      return;
    }
    const course = await CoursesService.findById(courseId, userId, {
      populate: [
        {
          path: 'versions.$*.course_materials.sections.lectures.content',
          select: ['type', 'duration'],
        },
        {
          path: 'versions.$*.course_materials.sections.lectures.resources',
          select: ['_id', 'name'],
        },
        {
          path: 'versions.$*.presentationalVideo',
          select: '+public +url',
        },
        { path: 'versions.$*.coupons' },
        {
          path: 'author',
          select: ['first_name', 'last_name'],
        },
      ],
      select: '+versions.$*.coupons',
      lean: true,
    });
    if (!course) {
      next(new HTTPError(404, 'Course not found'));
      return;
    }
    res.json(course);
  } catch (err) {
    next(err);
  }
});

/**
 * Delete course
 * @since 1.0
 */
router.delete('/courses/:courseId', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Courses']
   */
  try {
    const { courseId } = req.params;
    const userId = req?.userData?.uid as string;

    await CoursesService.deleteCourse({ courseId, userId });
    res.sendStatus(200);
  } catch (err) {
    next(err);
  }
});

/**
 * Get course live version
 * @since v1.0
 */
router.get('/courses/:courseId/live', async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Courses']
   */
  try {
    const { courseId } = req.params;
    if (!courseId) {
      next(new HTTPError(400, 'Course ID is required'));
      return;
    }
    const course = await CoursesService.getLiveVersion(courseId);
    if (!course) {
      next(new HTTPError(404, 'Course not found'));
      return;
    }
    res.json(course);
  } catch (err) {
    next(err);
  }
});

/**
 * Get course draft version
 * @since v1.0
 */
router.get('/courses/:courseId/draft', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Courses']
   */
  try {
    const userId = req?.userData?.uid as string;
    const { courseId } = req.params;
    if (!courseId) {
      next(new HTTPError(400, 'Course ID is required'));
      return;
    }
    const course = await CoursesService.getDraftVersion(courseId, userId);
    if (!course) {
      next(new HTTPError(404, 'Course not found'));
      return;
    }
    res.json(course);
  } catch (err) {
    next(err);
  }
});

/**
 * Create course new draft version
 * @since v1.0
 */
router.post('/courses/:courseId/draft', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Courses']
   */
  try {
    const userId = req?.userData?.uid as string;
    const { courseId } = req.params;
    if (!courseId) {
      next(new HTTPError(400, 'Course ID is required'));
      return;
    }
    const course = await CoursesService.createDraftVersion(courseId, userId);
    if (!course) {
      next(new HTTPError(500, 'Unable to create Draft version'));
      return;
    }
    res.json(course);
  } catch (err) {
    next(err);
  }
});

export default router;
