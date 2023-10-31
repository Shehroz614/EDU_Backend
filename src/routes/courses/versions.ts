import express, { NextFunction, Request, Response } from 'express';
import isAuth from '@middlewares/isAuth';
import HTTPError from '@errors/HTTPError';
import CoursesService from '@services/courses';

const router = express.Router();

/**
 * Get course specific version
 * @since v1.0
 */
router.get('/courses/:courseId/:courseVersion', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Courses']
   */
  try {
    const userId = req?.userData?.uid as string;
    const { courseId, courseVersion: versionNumber } = req.params;
    if (!courseId) {
      next(new HTTPError(400, 'Course ID is required'));
      return;
    }
    const course = await CoursesService.getCourseVersion(courseId, versionNumber, userId, {
      populate: [
        {
          path: 'versions.course_materials.sections.lectures.content',
          select: ['type', 'duration'],
        },
        {
          path: 'versions.course_materials.sections.lectures.resources',
          select: ['_id', 'name'],
        },
        {
          path: 'versions.presentationalVideo',
          select: '+public +url',
        },
        {
          path: 'author',
          select: ['first_name', 'last_name'],
        },
      ],
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
 * Update course version
 * @since v1.0
 */
router.patch('/courses/:courseId/:courseVersion', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Courses']
   */
  try {
    const userId = req?.userData?.uid as string;
    const { courseId, courseVersion: versionNumber } = req.params;
    const { updatedFields } = req.body;
    const patched_fields = await CoursesService.patchVersion({
      userId,
      courseId,
      versionNumber,
      updated_fields: updatedFields,
    });
    res.json(patched_fields);
  } catch (err) {
    next(err);
  }
});

export default router;
