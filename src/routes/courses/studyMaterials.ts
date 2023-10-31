import isAuth from '@middlewares/isAuth';
import express, { NextFunction, Request, Response } from 'express';
import admin from 'firebase-admin';
import { v4 as uuid } from 'uuid';
import CoursesService from '@services/courses';
import Oracle from '@services/oracle';
import HTTPError from '@errors/HTTPError';
import { isEmpty } from '@middlewares/miniLodash';
import multer from 'multer';

const router = express.Router();

/**
 * Create course section
 * @since v1.0
 */
router.post(
  '/courses/:courseId/:courseVersion/sections',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId, courseVersion: versionNumber } = req.params;
      const { title, description } = req.body;
      const section = await CoursesService.createSection({
        courseId,
        userId,
        versionNumber,
        data: { title, description },
      });
      res.json(section);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * update course section order
 * @since v1.0
 */
router.put(
  '/courses/:courseId/:courseVersion/sections',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId, courseVersion: versionNumber } = req.params;
      const { sections } = req.body;
      const sorted_sections = await CoursesService.sectionsPermutation({
        courseId,
        versionNumber,
        userId,
        sections,
      });
      res.json(sorted_sections);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * update course section
 * @since v1.0
 */
router.patch(
  '/courses/:courseId/:courseVersion/sections/:sectionId',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId, courseVersion: versionNumber, sectionId } = req.params;
      const { title, description = null } = req.body;
      const section = await CoursesService.patchSection({
        courseId,
        userId,
        versionNumber,
        sectionId,
        data: { title, description },
      });
      res.json(section);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Delete course section
 * @since v1.0
 */
router.delete(
  '/courses/:courseId/:courseVersion/sections/:sectionId',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId, courseVersion: versionNumber, sectionId } = req.params;
      const section = await CoursesService.deleteSection({
        courseId,
        userId,
        versionNumber,
        sectionId,
      });
      res.json(section);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Add course lecture
 * @since v1.0
 */
router.post(
  '/courses/:courseId/:courseVersion/sections/:sectionId/lectures',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId, courseVersion: versionNumber, sectionId } = req.params;
      const { preview, title, duration } = req.body;
      const data = { title, preview, duration };
      const lecture = await CoursesService.createLectureWithRetry(
        {
          userId,
          courseId,
          versionNumber,
          sectionId,
          data,
        },
        3,
        5000,
      );
      res.json(lecture);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Update course lecture order
 * @since v1.0
 */
router.put(
  '/courses/:courseId/:courseVersion/sections/:sectionId/lectures',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId, courseVersion: versionNumber } = req.params;
      const { sections } = req.body;

      const sorted_sections = await CoursesService.lecturePermutation({
        userId,
        courseId,
        versionNumber,
        sections,
      });

      res.json(sorted_sections);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Get course lecture
 * @since v1.0
 */
router.get(
  '/courses/:courseId/:courseVersion/sections/:sectionId/lectures/:lectureId',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId, courseVersion: versionNumber, sectionId } = req.params;
      const { preview, title } = req.body;

      const data = { title, preview };
      const lecture = await CoursesService.createLecture({
        userId,
        courseId,
        versionNumber,
        sectionId,
        data,
      });
      res.json(lecture);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Update course lecture
 * @since v1.0
 */
router.patch(
  '/courses/:courseId/:courseVersion/sections/:sectionId/lectures/:lectureId',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId, courseVersion: versionNumber, sectionId, lectureId } = req.params;
      const { preview, title } = req.body;

      const data = { title, preview };
      const lecture = await CoursesService.patchLecture({
        userId,
        courseId,
        versionNumber,
        sectionId,
        lectureId,
        data,
      });
      res.json(lecture);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Delete course lecture
 * @since v1.0
 */
router.delete(
  '/courses/:courseId/:courseVersion/sections/:sectionId/lectures/:lectureId',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId, courseVersion: versionNumber, sectionId, lectureId } = req.params;
      await CoursesService.deleteLecture({
        userId,
        courseId,
        versionNumber,
        sectionId,
        lectureId,
      });
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Get course lecture content
 * @since v1.0
 */
router.get(
  '/courses/:courseId/:courseVersion/sections/:sectionId/lectures/:lectureId/contents/:contentId',
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const { courseId, courseVersion: versionNumber, sectionId, contentId, lectureId } = req.params;
      const token = req?.headers?.authorization?.split(' ')[1] as string;
      const userId = token ? (await admin.auth().verifyIdToken(token)).uid : null;

      const content = await CoursesService.getContent({
        courseId,
        versionNumber,
        sectionId,
        lectureId,
        contentId,
        userId,
      });
      res.send(content);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Delete course lecture content
 * @since v1.0
 */
router.delete(
  '/courses/:courseId/:courseVersion/sections/:sectionId/lectures/:lectureId/contents/:contentId',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { contentId } = req.params;
      await CoursesService.deleteContent({ userId, contentId });
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Link course content with lecture
 * @since v1.0
 */
router.post(
  '/courses/:courseId/:courseVersion/sections/:sectionId/lectures/:lectureId/contents/:contentId/link',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId, courseVersion: versionNumber, sectionId, lectureId, contentId } = req.params;
      await CoursesService.linkLectureToContentWithRetry(
        {
          courseId,
          versionNumber,
          sectionId,
          lectureId,
          contentId,
          userId,
        },
        3,
        5000,
      );
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Link course resources with lecture
 * @since v1.0
 */
router.post(
  '/courses/:courseId/:courseVersion/sections/:sectionId/lectures/:lectureId/resources/:resourceId/link',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId, courseVersion: versionNumber, sectionId, lectureId, resourceId } = req.params;
      await CoursesService.linkLectureToResource({
        userId,
        courseId,
        versionNumber,
        sectionId,
        lectureId,
        resourceId,
      });
      res.send();
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Get uploader URL for video
 * @since v1.0
 */
router.post(
  '/courses/:courseId/:courseVersion/video-upload-url',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId } = req.params;
      const { parts, file: fileName } = req.body;
      const file = `${uuid()}.${fileName.split('.').pop()}`;

      if (!file || !parts) {
        next(new HTTPError(400, 'No required fields'));
        return;
      }
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
      const path = `content-storage/courses/${courseId}/private/videos`;

      // const doesExist = await Oracle.isFileReal(`${path}/${fileName}`);
      // if (doesExist) {
      //   next(new HTTPError(409, 'File already exists'));
      //   return;
      // }

      const response = await Oracle.createPreAuthenticatedRequest(path, file, expiry, 'ObjectReadWrite');
      if (isEmpty(response.url)) {
        next(new HTTPError(500, 'Some unusual problem'));
        return;
      }

      const { uploadId, urls } = await Oracle.generatePreSignedUrlsParts(parts, response.url);
      res.json({ uploadId, file: response.file, urls });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Get uploader url for resources
 * @since v1.0
 */
router.post(
  '/courses/:courseId/:courseVersion/resource-upload-url',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId } = req.params;
      const { parts, file: fileName } = req.body;
      const file = `${uuid()}.${fileName.split('.').pop()}`;

      if (!file || !parts) {
        next(new HTTPError(400, 'No required fields'));
        return;
      }
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
      const path = `content-storage/courses/${courseId}/private/resources`;

      // const doesExist = await Oracle.isFileReal(`${path}/${fileName}`);
      // if (doesExist) {
      //   next(new HTTPError(409, 'File already exists'));
      //   return;
      // }

      const response = await Oracle.createPreAuthenticatedRequest(path, file, expiry, 'ObjectReadWrite');
      if (isEmpty(response.url)) {
        next(new HTTPError(500, 'Some unusual problem'));
        return;
      }

      const { uploadId, urls } = await Oracle.generatePreSignedUrlsParts(parts, response.url);
      res.json({ uploadId, file: response.file, urls });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Get download url for resources
 * @since v1.0
 */
router.get(
  '/courses/:courseId/:courseVersion/resources/:resourceId',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId, resourceId } = req.params;

      if (!courseId) {
        next(new HTTPError(400, 'Course ID is required'));
        return;
      }
      if (!resourceId) {
        next(new HTTPError(400, 'Resource ID is required'));
        return;
      }

      const response = await CoursesService.getResourceURL(courseId, resourceId, userId);
      res.json(response);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Add course/lecture videos
 * @since v1.0
 */
router.post(
  '/courses/:courseId/:courseVersion/video',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId } = req.params;

      const { uploadId, parts, contentName, duration, fileName } = req.body;
      const path = `content-storage/courses/${courseId}/private/videos/${fileName}`;
      await Oracle.commitMultiPartUpload(path, uploadId, parts);

      const content = await CoursesService.createContent({
        userId,
        contentName,
        duration,
        courseId,
        content: fileName,
        type: 'video',
      });

      content.public = {
        url: await Oracle.generateUrl(path),
        is_public: false,
      };
      res.json(content);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Delete course video
 * @since v1.0
 */
router.delete(
  '/courses/:courseId/:courseVersion/video/:videoName',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
       #swagger.responses[200] = 200
       #swagger.responses[403] = {
          schema: {
            $ref: '#/definitions/course/properties/403'
          }
       }
       #swagger.responses[404] = {
          schema: {
            $ref: '#/definitions/course/properties/400'
          }
       }
       #swagger.responses[500] = {
          schema: {
            $ref: '#/definitions/course/properties/500'
          }
       }
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId, courseVersion: versionNumber, videoName } = req.params;

      await CoursesService.deleteContentByName({
        userId,
        courseId,
        versionNumber,
        contentName: videoName,
      });
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Add course text content
 * @since v1.0
 */
router.post(
  '/courses/:courseId/:courseVersion/text',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId } = req.params;
      const { lecture_content } = req.body || {};

      const { content, contentName, duration } = lecture_content;

      const new_content = await CoursesService.createContent({
        userId,
        content,
        courseId,
        contentName,
        duration,
        type: 'text',
      });
      res.json(new_content);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Add course Lecture Image content
 * @since v1.0
 */
router.post(
  '/courses/:courseId/:courseVersion/media',
  [isAuth, multer().single('media')],
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId, courseVersion: versionNumber } = req.params;
      const { file } = req;
      if (!file) {
        next(new HTTPError(400, 'Bad Request'));
        return;
      }

      const response = await CoursesService.addContentMedia(courseId, versionNumber, userId, file);
      res.json(response);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Update course text content
 * @since v1.0
 */
router.patch(
  '/courses/:courseId/:courseVersion/text/:contentId',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { contentId } = req.params;
      const { lecture_content } = req.body || {};

      const { content, contentName, duration } = lecture_content;
      const new_content = await CoursesService.patchTextContent({
        userId,
        content,
        contentId,
        contentName,
        duration,
      });

      res.json(new_content); // should discuss what we need to return
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Delete course text content
 * @since v1.0
 * @todo - implement
 */
router.delete(
  '/courses/:courseId/:courseVersion/text/:contentId',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
    } catch (err) {
      next(err);
    }
  },
);

/**
 * create course resource
 * @since v1.0
 */
router.post(
  '/courses/:courseId/:courseVersion/resources',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId } = req.params;

      const { uploadId, parts, contentName, fileName } = req.body;
      const path = `content-storage/courses/${courseId}/private/resources/${fileName}`;
      await Oracle.commitMultiPartUpload(path, uploadId, parts);

      const resource = await CoursesService.createResource({
        courseId,
        userId,
        fileName,
        contentName,
      });
      res.json(resource);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Delete course resource
 * @since v1.0
 */
router.delete(
  '/courses/:courseId/:courseVersion/resources/:resourceId',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     */
    try {
      const userId = req?.userData?.uid as string;
      const { courseId, courseVersion: versionNumber, resourceId } = req.params;
      await CoursesService.deleteResource({ userId, resourceId, courseId, versionNumber });
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
