import express, { NextFunction, Request, Response } from 'express';
import isAuth from '@middlewares/isAuth';
import CoursesService from '@services/courses';
import HTTPError from '@errors/HTTPError';
import oracle from '@services/oracle';
import { isEmpty } from '@middlewares/miniLodash';

const router = express.Router();

/**
 * Get public file upload URL
 * @since v1.0
 */
router.post(
  '/courses/:courseId/:courseVersion/public-file-url',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId } = req.params;
      const { file } = req.body;

      const isCourseReal = await CoursesService.exists({
        _id: courseId,
        author: userId,
      });
      if (!isCourseReal) {
        next(new HTTPError(404, 'Course not found'));
        return;
      }

      const today = new Date();
      const expiry = new Date(today);
      expiry.setHours(expiry.getHours() + 2);
      const path = `content-storage/courses/${courseId}/public`;

      const doesExist = await oracle.isFileReal(`${path}/${file}`);
      if (doesExist) {
        next(new HTTPError(409, 'File already exists'));
        return;
      }

      const response = await oracle.createPreAuthenticatedRequest(path, file, expiry, 'ObjectWrite');
      if (isEmpty(response.url)) {
        next(new HTTPError(500, 'Some unusual problem'));
        return;
      }
      res.json(response);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Update course presentational image
 * @since v1.0
 */
router.post(
  '/courses/:courseId/:courseVersion/presentational-photo',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId, courseVersion: versionNumber } = req.params;
      const { file } = req.body;

      if (!file) {
        next(new HTTPError(400, 'Filename field is missing'));
        return;
      }
      const path = `content-storage/courses/${courseId}/public/${file}`;

      const [isCourseReal, isFileReal] = await Promise.all([
        CoursesService.exists({
          _id: courseId,
          author: userId,
        }),
        oracle.isFileReal(path),
      ]);
      if (!isCourseReal) {
        next(new HTTPError(404, 'Course not found'));
        return;
      }
      if (!isFileReal) {
        next(new HTTPError(404, 'Photo not found'));
        return;
      }
      const imageUrl = await oracle.generateUrl(path);
      const course = await CoursesService.patchVersion({
        courseId,
        userId,
        versionNumber,
        updated_fields: { presentationalImage: imageUrl },
      });
      res.json(course);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Update course presentational video
 * @since v1.0
 */
router.post(
  '/courses/:courseId/:courseVersion/presentational-video',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId, courseVersion: versionNumber } = req.params;
      const { contentName, file, duration } = req.body;

      if (!file) {
        next(new HTTPError(400, 'Filename field is missing'));
        return;
      }
      const path = `content-storage/courses/${courseId}/public/${file}`;

      const [isCourseReal, isFileReal] = await Promise.all([
        CoursesService.exists({
          _id: courseId,
          author: userId,
        }),
        oracle.isFileReal(path),
      ]);
      if (!isCourseReal) {
        next(new HTTPError(404, 'Course not found'));
        return;
      }
      if (!isFileReal) {
        next(new HTTPError(404, 'Media not found'));
        return;
      }
      const fileUrl = await oracle.generateUrl(path);
      const content = await CoursesService.createContent({
        userId,
        courseId,
        duration,
        contentName,
        content: file,
        type: 'video',
        public: {
          url: fileUrl,
          is_public: true,
        },
      });
      await CoursesService.patchVersion({
        courseId,
        userId,
        versionNumber,
        updated_fields: { presentationalVideo: content._id },
      });
      res.json(content);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
