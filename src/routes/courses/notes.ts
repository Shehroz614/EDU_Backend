import express, { Request, Response, NextFunction } from 'express';
import isAuth from '@middlewares/isAuth';
import CoursesService from '@services/courses';
import HTTPError from '@errors/HTTPError';

const router = express.Router();

/**
 * Get Course notes
 * @since v1.0
 */
router.get('/courses/:courseId/notes', isAuth, async (req: Request, res: Response, next: NextFunction) => {
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
    const notes = await CoursesService.getNotes(courseId, userId);
    res.send(notes);
  } catch (err) {
    next(err);
  }
});

/**
 * Create new Course note
 * @since v1.0
 */
router.post('/courses/:courseId/notes', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Courses']
   */
  try {
    const { courseId } = req.params;
    const userId = req?.userData?.uid as string;
    const { title, description, lectureId } = req.body;
    const note = await CoursesService.createNote({
      title,
      description,
      courseId,
      lectureId,
      userId,
    });
    res.send(note);
  } catch (err) {
    next(err);
  }
});

/**
 * Update Course note
 * @since v1.0
 */
router.patch('/courses/:courseId/notes/:noteId', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Courses']
   */
  try {
    const { courseId, noteId } = req.params;
    const userId = req?.userData?.uid as string;
    const { title, description } = req.body;
    const note = await CoursesService.updateNote(courseId, noteId, userId, { title, description });
    res.send(note);
  } catch (err) {
    next(err);
  }
});

/**
 * Get Course notes
 * @since v1.0
 */
router.delete('/courses/:courseId/notes/:noteId', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Courses']
   */
  try {
    const userId = req?.userData?.uid as string;
    const { courseId, noteId } = req.params;
    if (!courseId) {
      next(new HTTPError(400, 'Course ID is required'));
      return;
    }
    if (!noteId) {
      next(new HTTPError(400, 'Note ID is required'));
      return;
    }
    await CoursesService.deleteNote(courseId, noteId, userId);
    res.sendStatus(200);
  } catch (err) {
    next(err);
  }
});

export default router;
