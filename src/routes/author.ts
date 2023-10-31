import express, { Request, Response, NextFunction } from 'express';
import isAuth from '@middlewares/isAuth';
import UserService from '@services/user';
import HTTPError from '@errors/HTTPError';

const router = express.Router();

/**
 * Get author details
 * @since v1.0
 */
router.get('/', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Author']
     #swagger.responses[200] = {
       description: 'Get Author details',
       schema: {
         firstName: 'John',
         lastName: 'Doe',
         avatar: 'https://cdn.edugram.io/user-storage/12345/avatars/example.png',
         averageRating: 4.85,
         totalStudents: 100,
         totalCourses: 8,
       }
    }
    #swagger.responses[404] = {
      schema: {
        success: false,
        status: 404,
        message: "User not found",
        stack: {}
      }
    }
    #swagger.responses[500] = {
      schema: {
        success: false,
        status: 500,
        message: "Something went wrong",
        stack: {}
      }
    }
  */
  try {
    const userId = req?.userData?.uid as string;
    if (!userId) {
      next(new HTTPError(400, 'User ID is required'));
      return;
    }
    const authorData = await UserService.getAuthorDetails(userId);
    res.send(authorData);
  } catch (err) {
    next(err);
  }
});

/**
 * Get author's intro video upload URL
 * @since v1.0
 */
router.post('/public-file-url', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req?.userData?.uid as string;
    const { file } = req.body;
    if (!userId) {
      next(new HTTPError(400, 'User ID is required'));
      return;
    }
    if (!file) {
      next(new HTTPError(400, 'File is required'));
      return;
    }
    const response = await UserService.getAuthorPublicFileURL(userId, file);
    res.send(response);
  } catch (err) {
    next(err);
  }
});

/**
 * Update author's intro video
 * @since v1.0
 */
router.post('/introduction-video', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req?.userData?.uid as string;
    const { file } = req.body;
    if (!userId) {
      next(new HTTPError(400, 'User ID is required'));
      return;
    }
    if (!file) {
      next(new HTTPError(400, 'File is required'));
    }
    const response = await UserService.updateAuthorIntroVideo(userId, file);
    res.send(response);
  } catch (err) {
    next(err);
  }
});

/**
 * Get Authors courses
 * @since v1.0
 */
router.get('/courses', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Author']
     #swagger.responses[200] = {
       description: 'Get Author courses',
       schema: [
          'courses'
       ]
    }
    #swagger.responses[500] = {
      schema: {
        success: false,
        status: 500,
        message: "Something went wrong",
        stack: {}
      }
    }
   */
  try {
    const userId = req?.userData?.uid as string;
    const courses = await UserService.getOwnCourses(userId);
    res.json(courses);
  } catch (err) {
    next(err);
  }
});

/**
 * Get stripe supported countries
 * @since v1.0
 */
router.get('/get-stripe-countries', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Author']
   #swagger.responses[200] = {
       description: 'Get Author courses',
       schema: {}
    }
   #swagger.responses[500] = {
      schema: {
        success: false,
        status: 500,
        message: "Something went wrong",
        stack: {}
      }
    }
   */
  try {
    const userId = req?.userData?.uid as string;
    const response = await UserService.getAuthorVerificationSupportedCountries(userId);
    res.send(response);
  } catch (err) {
    next(err);
  }
});

/**
 * Get Author verification status
 * @since v1.0
 */
router.get('/get-verification-status', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Author']
   #swagger.responses[200] = {
       description: 'Get Author courses',
       schema: {}
    }
   #swagger.responses[500] = {
      schema: {
        success: false,
        status: 500,
        message: "Something went wrong",
        stack: {}
      }
    }
   */
  try {
    const userId = req?.userData?.uid as string;
    const response = await UserService.getAuthorVerificationStatus(userId);
    res.send(response);
  } catch (err) {
    next(err);
  }
});

/**
 * Create author verification session
 * @since v1.0
 */
router.post('/get-verification-session', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Author']
     #swagger.responses[200] = {
       description: 'Create Author verification session',
       schema: {
          object: "account_link",
          created: 1688561809,
          expires_at: 1688562109,
          url: "https://connect.stripe.com/setup/c/acct_ACCOUNT_ID/ACC_LINK_SESSION_ID"
       }
    }
    #swagger.responses[404] = {
      schema: {
        success: false,
        status: 404,
        message: "User not found",
        stack: {}
      }
    }
    #swagger.responses[500] = {
      schema: {
        success: false,
        status: 500,
        message: "Something went wrong",
        stack: {}
      }
    }
   */
  try {
    const userId = req?.userData?.uid as string;
    const { country } = req.body;
    if (!country) {
      next(new HTTPError(400, 'Country is required'));
      return;
    }
    const response = await UserService.createAuthorVerificationSession(userId, country);
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * Create author verification session
 * @since v1.0
 */
router.post('/reset-verification-session', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Author']
   #swagger.responses[200] = 200
   #swagger.responses[404] = {
      schema: {
        success: false,
        status: 404,
        message: "User not found",
        stack: {}
      }
    }
   #swagger.responses[500] = {
      schema: {
        success: false,
        status: 500,
        message: "Something went wrong",
        stack: {}
      }
    }
   */
  try {
    const userId = req?.userData?.uid as string;
    if (!userId) {
      next(new HTTPError(400, 'User is required'));
      return;
    }
    const response = await UserService.resetAuthorVerificationSession(userId);
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * Request author verification
 * @since v1.0
 */
router.post('/request-author-verification', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Author']
   #swagger.responses[404] = {
      schema: {
        success: false,
        status: 404,
        message: "User not found",
        stack: {}
      }
    }
   #swagger.responses[500] = {
      schema: {
        success: false,
        status: 500,
        message: "Something went wrong",
        stack: {}
      }
    }
   */
  try {
    const userId = req?.userData?.uid as string;
    const response = await UserService.requestAuthorVerification(userId);
    res.send(response);
  } catch (err) {
    next(err);
  }
});

export default router;
